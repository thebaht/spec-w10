import json
import sys
from dbcontext import *
from sqlalchemy import and_
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import db_seed
from sqlalchemy.sql import operators
from sqlalchemy.orm.collections import InstrumentedList
import models
import os
import uuid
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, get_jwt, jwt_required, get_jwt_identity, create_refresh_token, set_access_cookies, unset_jwt_cookies, unset_access_cookies
from functools import wraps
from datetime import timedelta

# Initialize database context and Flask app
dbcontext = DatabaseContext.get_instance()   # Create an instance of the DatabaseContext class
dbcontext.clear_database()      # Clear the database, to avoid duplicate data when populating
app = Flask(__name__)           # Initialize a Flask app instance
cors = CORS(app)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])  # Update with your frontend URL

bcrypt = Bcrypt(app)
app.config['JWT_VERIFY_SUB'] = False
app.config['JWT_SECRET_KEY'] = 'asd'
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=30)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_COOKIE_SECURE'] = False
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_CSRF_IN_COOKIES"] = False
jwt = JWTManager(app)

IMAGE_FOLDER = os.path.join(os.getcwd(), 'static', 'images')
app.config['IMAGE_FOLDER'] = IMAGE_FOLDER
os.makedirs(IMAGE_FOLDER, exist_ok=True)
allowed_image_extensions = {'jpg', 'jpeg'}

def validate_image_extention(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_image_extensions

operator_map = {     # dictionary to look up operators from a string
    '>': operators.gt,
    '<': operators.lt,
    '>=': operators.ge,
    '<=': operators.le,
    '==': operators.eq,
    '!=': operators.ne,
    "in": operators.in_op,
    "not_in": operators.notin_op,
    "range": None
}

default_operator = '=='

def filter_build(table, lst):
    filters = []
    for key, value in lst:
        if isinstance(value, list):
            operator, value = value
        else:
            operator = default_operator

        if operator in operator_map:
            column = getattr(table, key)
            if operator == 'range':
                if isinstance(value, list):
                    start, end = value
                    filters.append(column.between(start,end))
                else:
                    raise ValueError(f"Invalid range for: {key}")
            else:
                filters.append(operator_map[operator](column, value))
        else:
            raise ValueError(f"Unsupported operator: {operator}")
    return filters

""" JSON Filter exempel:
filter = {
    "id":       "1",                                                # bruger == som default hvis andet ikke er givet
    "price":    ["!=", "200"],                                      # Bruger operatoren !=
    "name":     ["in", ["Settlers of Cataan", "Ticket to ride"]],   # in og not_in, tager liste af vilkårlig længde
    "discount": ["range", [10, 20]],                                # Range query tager liste med længde == 2.
}
"""

#! Populate db with db_seed.py here
def populateDB():
    print("Populating database")
    with dbcontext.get_session() as S:  # Start a session with the database
        S.add_all(db_seed.create_customers())

        manufacturers, products = db_seed.create_manufacturers_and_products()
        S.add_all(manufacturers)
        S.add_all(products)
        
        admin_acc = User(
            email="a@a",
            password=bcrypt.generate_password_hash('123').decode('utf-8'),
            admin=True,
        )
        S.add(admin_acc)

        S.commit()  # Commit the changes to the database
#! ..................................


def serialize_model(inst: Base, mappers: List[str] = []):
    """
    Serializes a SQLAlchemy model object into a dictionary, excluding relationship references.

    Args:
        obj (Base): SQLAlchemy model object.

    Returns:
        dict: A dictionary representation of the model.
    """

    table = models.TABLES_GET(inst.__table__.name)

    serialized_columns = {
        c.name: getattr(inst, c.name) # Map attribute names to their values
        for c in table.columns        # Get all columns
    }

    def serialize_mapper(name, inst, mappers: List[str]):
        prefix = f"{name}."
        mappers = [
            mapper[len(prefix):]
            for mapper in mappers
            if mapper.startswith(prefix)
        ]

        if hasattr(inst, "__iter__"):
            return [serialize_model(mapper, mappers) for mapper in inst]
        else:
            return serialize_model(inst, mappers)

    serialized_mappers = {
        mapper: serialize_mapper(mapper, getattr(inst, mapper), mappers)
        for mapper in mappers
        if hasattr(inst, mapper)
    }

    serialized_columns.update(serialized_mappers)

    return serialized_columns


class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, models.Table):
            return {
                "name": o.name,
                "table": o.table,
                "polymorphic": o.polymorphic,
                "columns": [self.default(column) for column in o.columns],
            }
        elif isinstance(o, models.TableColumn):
            return {
                "name": o.name,
                "type": o.type.__name__,
                "optional": o.optional,
                "primary_key": o.primary_key,
                "foreign_keys": [
                    {
                        "table": key.column.table.name,
                        "column": key.column.name
                    }
                    for key in o.foreign_keys
                ],
                "mapper": o.mapper,
            }
        else:
            return super().default(o)


@app.route('/api/tables', methods=['GET'])
def tables_all():
    """
    Returns the database table definitions for everything.

    Returns:
        Response: JSON response of table definitions.
    """
    return json.dumps(models.TABLES, cls=EnhancedJSONEncoder), 200 # Return serialized data as a JSON response


@app.route('/api/tables/item', methods=['GET'])
def tables_item():
    """
    Returns the database table definitions for items.

    Returns:
        Response: JSON response of table definitions.
    """
    return json.dumps(models.ITEMS, cls=EnhancedJSONEncoder), 200 # Return serialized data as a JSON response

def user_required(f):
    """
    Decorator that ensures the user has admin rights.
    """
    @wraps(f)
    def check_user(*args, **kwargs):
        session = dbcontext.get_session()
        user_id = get_jwt_identity().get('id')
        user = session.query(models.User).filter(models.User.id == user_id).first()
        if not user or user.token != request.cookies.get('access_token_cookie'):
            return jsonify({'message': 'Need to be logged to access this endpoint!'}), 403
        return f(*args, **kwargs)
    return check_user

def admin_required(f):
    """
    Decorator that ensures the user has admin rights.
    """
    @wraps(f)
    def check_admin(*args, **kwargs):
        session = dbcontext.get_session()
        table = models.TABLES_GET('user').cls
        user_id = get_jwt_identity().get('id')
        if not session.query(table).filter(table.id == user_id).first().admin:
            return jsonify({'message': 'Admin rights are required to access this endpoint!'}), 403
        return f(*args, **kwargs)
    return check_admin

@app.route('/api/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user)
    return jsonify(access_token=new_access_token), 200


@app.route('/api/get/<string:table_name>', methods=['POST'])
def get_items(table_name):
    """
    Acts like get_items, but responds to POST
    Used to bypass limitations on body in get reqquests
    """
    session = dbcontext.get_session()  # Start a new database session
    try:
        # Get the table class from on its name
        table = models.TABLES_GET(table_name).cls

        mappers = []
        if request.data:
            if info := request.json:  # Extract extra request info from the request body
                if "mappers" in info:
                    mappers = info.pop("mappers")

                # Reformat filter to use as arguments for query
                filter = filter_build(table, info)
                # Query the table with the filter
                data = session.query(table).filter(and_(*filter)).all()
        else:
            # If no filter, fetch all rows from the table
            data = session.query(table).all()
        data = [serialize_model(obj, mappers)
                for obj in data]  # Serialize the query results
    except Exception as e:
        session.rollback()  # Roll back changes if an error occurs
        return str(e), 400  # Return error message with 400 status code
    finally:
        _commit(session)  # Commit transaction to database
        session.close()  # Close the session
    return jsonify(data), 200  # Return serialized data as a JSON response


@app.route('/api/get/<string:table_name>/<int:id>', methods=['POST'])
def get_item(table_name, id):
    """
    Retrieves a single item from a specific table by its ID.

    Args:
        table_name (str): The name of the database table.
        id (int): The ID of the item to retrieve.

    Returns:
        Response: JSON response containing the queried item.
    """
    session = dbcontext.get_session() # Start a new database session
    table = models.TABLES_GET(table_name).cls # Get the table class from on its name
    try:
        mappers = []
        if request.data:
            if info := request.json:  # Extract extra request info from the request body
                if "mappers" in info:
                    mappers = info.pop("mappers")

        data = session.query(table).filter(table.id == id).first() # Query the table for the specific item by its ID
        data = serialize_model(data, mappers) # Serialize the query results
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return jsonify(data), 200 # Return serialized data as a JSON response




@app.route('/api/create', methods=['POST'], endpoint='create_entry')
@jwt_required()
@admin_required
def create_item():
    """
    Creates a new item in the database based on the JSON in the request body.

    Returns:
        Response: JSON response containing the created item.
    """
    session = dbcontext.get_session() # Start a new database session
    try:
        blueprint = dict(request.json.items()) # Extract the update data from request body, and parse it into a dictionary
        if request.files:
            img = request.files['image']
            if img and validate_image_extention(img.filename):
                name = str(uuid.uuid4()) + os.path.splitext(img.filename)[1]
                path = os.path.join(app.config['IMAGE_FOLDER'], name)
                img.save(path)
                blueprint['image'] = f"static/images/{name}"
            else:
                raise Exception('invalid image')
        else:
            img = os.path.join(app.config['IMAGE_FOLDER'], 'default.jpg')
            name = str(uuid.uuid4()) + os.path.splitext(img.filename)[1]
            path = os.path.join(app.config['IMAGE_FOLDER'], name)
            blueprint['image'] = f"static/images/{name}"

        table = models.TABLES_GET(blueprint.pop("type")).cls
        item = table(**blueprint)
        session.add(item) # Add the new item to the session
        data = serialize_model(item) # Serialize the created item
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return jsonify(data), 200 # Return serialized item as a JSON response


@app.route('/api/order', methods=['POST'])
def order():
    """
    Creates a new item in the database based on the JSON in the request body.

    Returns:
        Response: JSON response containing the created item.
    """
    session = dbcontext.get_session() # Start a new database session
    try:
        blueprint = dict(request.json.items()) # Extract the update data from request body, and parse it into a dictionary
        order_products = blueprint.pop("order_products")

        blueprint["timestamp"] = datetime.fromisoformat(blueprint["timestamp"])

        order = Order(**blueprint)

        order.order_products = [OrderProduct(order_id=order.id, **order_product) for order_product in order_products]

        session.add(order)

        session.merge(order)

        for orderproduct in order.order_products:
            print(orderproduct.product)
            if orderproduct.product.stock >= orderproduct.quantity:
                orderproduct.product.stock -= orderproduct.quantity
            else:
                raise Exception("Not enough products in stock")

        data = serialize_model(order) # Serialize the created item
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return jsonify(data), 200 # Return serialized item as a JSON response



@app.route('/api/update/<string:table_name>/<int:id>', methods=['PUT'], endpoint='update_entry')
@jwt_required()
@admin_required
def update_item(table_name, id):
    """
    Updates an existing item in a specific table by its ID.
    The attributes to update needs to be provided as json in the body of the request.

    Args:
        table_name (str): The name of the database table.
        id (int): The ID of the item to update.

    Returns:
        Response: JSON response containing the updated item ID.
    """
    session = dbcontext.get_session() # Start a new database session
    table = models.TABLES_GET(table_name).cls # Get the table class from on its name
    try:
        blueprint = dict(request.json.items()) # Extract the update data from request body, and parse it into a dictionary
        if request.files:
            img = request.files['image']
            if img and validate_image_extention(img.filename):
                name = str(uuid.uuid4()) + os.path.splitext(img.filename)[1]
                path = os.path.join(app.config['IMAGE_FOLDER'], name)
                img.save(path)
                blueprint['image'] = f"static/images/{name}"
            else:
                raise Exception('invalid image')
        obj = session.query(table).filter(table.id == id).first()
        for key, value in blueprint.items():
            setattr(obj, key, value)
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return jsonify(id), 200 # Return the ID of the updated item as a JSON response




@app.route('/api/delete/<string:table_name>/<int:id>', methods=['DELETE'], endpoint='delete_entry')
@jwt_required()
@admin_required
def delete_item(table_name, id):
    """
    Removes an item from the database in a specific table by its ID.

    Args:
        table_name (str): The name of the database table.
        id (int): The ID of the item to remove.

    Returns:
        Response: A success message.
    """
    session = dbcontext.get_session() # Start a new database session
    table = models.TABLES_GET(table_name).cls # Get the table class from on its name
    try:
        data = session.query(table).filter(table.id == id).first() # Query the table for the specific item by its ID
        session.delete(data) # Delete the item from the session
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return "deleted", 200 # Return a success message


@app.route('/api/user', methods=['POST'])
def create_user():
    session = dbcontext.get_session()
    try:
        table = models.TABLES_GET('user').cls
        blueprint = dict(request.json.items())
        blueprint['password'] = bcrypt.generate_password_hash(blueprint['password']).decode('utf-8')
        user = table(**blueprint)
        # email = request.args.get("email")
        # password = bcrypt.generate_password_hash(request.args.get("password")).decode('utf-8')
        # user = table(email=email, password=password)

        session.add(user)
        session.commit()
        access_token = create_access_token(identity={'id': user.id, 'email': user.email})
        refresh_token = create_refresh_token(identity={'id': user.id, 'email': user.email})
        user.token = access_token
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    response = Response(
        json.dumps({access_token: access_token, refresh_token: refresh_token}),
        mimetype="application/json",
        headers={
            "access-control-allow-credentials": "true",
            "access-control-allow-methods": "GET,PUT,POST,DELETE,UPDATE,OPTIONS",
            "access-control-allow-origin": "http://localhost:5173",
        }
    )

    set_access_cookies(response, access_token)
    # set_access_cookies(response, refresh_token)

    # cookies = {access_token: access_token, refresh_token: refresh_token}
    # for name, value in cookies.items():
    #     exp = get_jwt(access_token).get('exp')
    #     response.set_cookie(key=name, value=value, expires=exp, secure=True, httponly=True)

    return response, 200 # Return a success message

@app.route('/api/login', methods=['POST'])
def login():
    session = dbcontext.get_session()
    try:
        table = models.TABLES_GET('user').cls

        blueprint = dict(request.json.items())
        user = session.query(table).filter(table.email == blueprint['email']).first()
        if not user or not bcrypt.check_password_hash(user.password, blueprint['password']):
            raise Exception("invalid login")

        # email = request.args.get("email")
        # password = request.args.get("password")
        # user = session.query(table).filter(table.email == email).first()
        # if not user or not bcrypt.check_password_hash(user.password, password):
        #     raise Exception("invalid login")

        access_token = create_access_token(identity={'id': user.id, 'email': user.email})
        refresh_token = create_refresh_token(identity={'id': user.id, 'email': user.email})
        user.token = access_token

    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session

    response = Response(
        json.dumps({access_token: access_token, refresh_token: refresh_token}),
        mimetype="application/json",
    )

    set_access_cookies(response, access_token)
    # set_access_cookies(response, refresh_token)

    # cookies = {access_token: access_token, refresh_token: refresh_token}
    # for name, value in cookies.items():
    #     exp = get_jwt(access_token).get('exp')
    #     response.set_cookie(key=name, value=value, expires=exp, secure=True, httponly=True)

    return response, 200 # Return a success message


@app.route('/api/logout', methods=['POST'])
@jwt_required()
@user_required
def logout():
    session = dbcontext.get_session()
    try:
        id = get_jwt_identity().get('id')
        user = session.query(models.User).filter(models.User.id == id).first()
        user.token = None
        response = jsonify(msg="Logout successful")
        unset_jwt_cookies(response)
        unset_access_cookies(response)

    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return response, 200


@app.route('/api/user/info', methods=['POST'], endpoint='set_user_information')
@jwt_required()
def set_user_information():
    session = dbcontext.get_session()
    try:
        table = models.TABLES_GET('user').cls

        blueprint = dict(request.json.items())
        user = session.query(table).filter(table.id == id).first()
        for key, value in blueprint.items():
            setattr(user, key, value)

    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return jsonify(user.id), 200 # Return a success message


@app.route('/api/user/info', methods=['GET'], endpoint='get_user_information')
@jwt_required()
def get_user_information():
    session = dbcontext.get_session()
    try:
        table = models.TABLES_GET('user').cls
        id = get_jwt_identity().get('id')
        user = session.query(table).filter(table.id == id).first()
        mappers = ['orders']
        data = serialize_model(user, mappers)
    except Exception as e:
        session.rollback() # Roll back changes if an error occurs
        return str(e), 400 # Return error message with 400 status code
    finally:
        _commit(session) # Commit transaction to database
        session.close() # Close the session
    return jsonify(data), 200 # Return a success message


@app.route('/api/istestmode')
def is_test_mode():
    return str(TESTMODE), 200

TESTMODE = False    # test mode state

def _commit(session:Session):
    """Wrapper function for session.commit.\n
    Ignores commits and rolls back changes if in TESTMODE"""
    if TESTMODE:
        session.rollback()  # roll back changes
    else:
        session.commit()    # commit changes

if __name__ == "__main__":
    TESTMODE = "testmode" in sys.argv   # testmode argument in terminal
    print(f"Testmode: {"Enabled" if TESTMODE else "Disabled"}")
    populateDB()    # populate db with example data
    app.run()   # start flask app
