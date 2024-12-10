from dataclasses import dataclass
from datetime import datetime
from typing import Set, List, Optional
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql.schema import Column, ForeignKey

# https://docs.sqlalchemy.org/en/20/orm/quickstart.html

class Base(DeclarativeBase):
    pass

class Manufacturer(Base):
    __tablename__ = "manufacturer"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))

    products: Mapped[List["Product"]] = relationship(
        back_populates="manufacturer", cascade="all, delete-orphan"
    )

class Product(Base):
    __tablename__ = "product"
    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(50))
    image: Mapped[str] = mapped_column(String(50))

    stock: Mapped[int] = mapped_column(default=0)
    price: Mapped[float]

    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturer.id"))
    manufacturer: Mapped["Manufacturer"] = relationship(back_populates="products")

    is_hot: Mapped[bool]

    weight: Mapped[float] = mapped_column(comment="[ounce]")
    cups: Mapped[float] = mapped_column(comment="[cup]")

    calories: Mapped[float] = mapped_column(comment="[kcal]")
    protein: Mapped[float] = mapped_column(comment="[g]")
    fat: Mapped[float] = mapped_column(comment="[g]")
    sodium: Mapped[float] = mapped_column(comment="[mg]")
    fiber: Mapped[float] = mapped_column(comment="[g]")
    carbohydrates: Mapped[float] = mapped_column(comment="[g]")
    sugars: Mapped[float] = mapped_column(comment="[g]")
    potassium: Mapped[float] = mapped_column(comment="[mg]")
    vitamins: Mapped[float] = mapped_column(comment="[%]")

    order_products: Mapped[List["OrderProduct"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )

class OrderProduct(Base):
    __tablename__ = "order_product"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"))
    order: Mapped["Product"] = relationship(back_populates="order_products")
    product_id: Mapped[int] = mapped_column(ForeignKey("product.id"))
    product: Mapped["Product"] = relationship(back_populates="order_products")
    order_id: Mapped[int] = mapped_column(ForeignKey("order.id"))
    order: Mapped["Order"] = relationship(back_populates="order_products")
    quantity: Mapped[int]

class Order(Base):
    __tablename__ = "order"
    id: Mapped[int] = mapped_column(primary_key=True)
    price: Mapped[float]
    timestamp: Mapped[datetime]
    customer_id: Mapped[int] = mapped_column(ForeignKey("customer.id"))
    customer: Mapped["Customer"] = relationship(back_populates="orders")
    address: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30))

    order_products: Mapped[List["OrderProduct"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )

class Customer(Base):
    __tablename__ = "customer"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(100))
    address: Mapped[str] = mapped_column(String(100))

    orders: Mapped[List["Order"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )

@dataclass
class TableColumn:
    inst: Column  # instance of Column class
    name: str  # column name
    type: object  # python type
    optional: bool  # nullable
    primary_key: bool
    foreign_keys: Set[ForeignKey]
    mapper: Optional[str]  # class field name that maps to this column

@dataclass
class Table:
    cls: Base  # class
    name: str  # class name
    table: str  # table name
    polymorphic: Optional[str] # column name for inheritance identity
    columns: List[TableColumn]  # database columns

    def matches_name(self, name: str) -> bool:
        lower = name.lower()
        return self.name.lower() == lower or self.table.lower() == lower

    def get_column(self, name: str) -> Optional[TableColumn]:
        return next(filter(lambda c: c.name == name or c.mapper == name, self.columns), None)


# generate list of Table's from module definitions
def __get_tables__() -> List[Table]:
    import sys, inspect as py_inspect
    from sqlalchemy.inspection import inspect as sa_inspect

    # get module table classes
    classes = [cls for _, cls in py_inspect.getmembers(sys.modules[__name__]) if hasattr(cls, '__table__')]

    tables = []
    for cls in classes:
        inspection = sa_inspect(cls)

        polymorphic = inspection.polymorphic_on.name if inspection.polymorphic_on is not None else None

        # generate list of TableColumn's by inspecting the table class
        columns = (attrs.columns[0] for attrs in inspection.mapper.column_attrs)
        columns = [
            TableColumn(
                column,
                column.name,
                column.type.python_type,
                column.nullable,
                column.primary_key,
                column.foreign_keys,
                None,  # potentially set in next part
            )
            for column in columns
        ]

        # a mapper is a class field that refers to another table using a foreign key in its own list of columns or the other table's columns
        # get dict of mappers that aren't hidden (doesn't start with _)
        mappers = {
            attr: getattr(cls, attr).mapper
            for attr in dir(cls)
            if not attr.startswith('_') and hasattr(getattr(cls, attr), 'mapper')
        }
        for field, mapper in mappers.items():
            # a mapper relationship is an SQL expression. by default it's an equals expression (e.g. other_table.id = table.other_id).
            for relationship in mapper.relationships:
                # get column on right hand side of relationship expression
                *_, mapper_column = relationship.primaryjoin.get_children()

                # find the column in the column list and assign the mapper name to the column mapper field
                column = next(filter(lambda column: column.name == mapper_column.name, columns), None)
                if column:
                    column.mapper = field

        # push table to list
        tables.append(Table(
            cls,
            cls.__name__,
            cls.__tablename__,
            polymorphic,
            columns,
        ))

    return tables

# list of tables in module
TABLES = __get_tables__()

# easy table lookup with table names
def TABLES_GET(name: str) -> Optional[Table]:
    return next(filter(lambda t: t.matches_name(name), TABLES), None)

if __name__ == '__main__':
    from pprint import pp as pprint
    pprint(TABLES)
