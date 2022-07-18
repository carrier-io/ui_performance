from tools import db


def init_db():
    db.Base.metadata.create_all(bind=db.engine)

