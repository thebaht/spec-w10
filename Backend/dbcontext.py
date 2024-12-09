from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dbinfo import connection_string
from models import *


class DatabaseContext:
    """
    A class to manage database interactions, including session creation, table management, and connection lifecycle.
    """
    _instance = None
    def get_instance():
        if DatabaseContext._instance is None:
            DatabaseContext._instance = DatabaseContext(manualCall=False)
        return DatabaseContext._instance

    def __init__(self, manualCall=True):
        """
        Initializes the database context by creating an engine, configuring a session factory,
        and ensuring all database tables are created.
        """
        if manualCall: raise Exception("YOU SHOULD NOT BE CALLING THIS CONSTRUCTOR >:(")
        self.engine = create_engine(connection_string, echo=False)  # Create a database engine using the connection string, SQL query logging disabled
        self.Session = sessionmaker(bind=self.engine)               # Create a session factory bound to the engine
        Base.metadata.create_all(self.engine)                       # Create all tables defined in the models module, if they don't already exist

    def get_session(self) -> Session:
        """
        Start a new database session.

        Returns:
            Session: A new SQLAlchemy session bound to the database engine.
        """
        return self.Session()

    def clear_database(self):
        """
        Drops all tables in the database and recreates them.
        """
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def close(self):
        """
        Dispose of the database engine to release resources when done.
        """
        self.engine.dispose()
