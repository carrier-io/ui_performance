from sqlalchemy import Column, Integer, String, Float

from tools import db_tools, db


class UIBaseline(db_tools.AbstractBaseMixin, db.Base):
    __tablename__ = "ui_baseline"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, unique=False, nullable=False)
    report_id = Column(Integer, unique=False, nullable=False)
    report_uid = Column(String, unique=False, nullable=False)
    test = Column(String, unique=False, nullable=False)
    environment = Column(String, unique=False, nullable=False)

    def insert(self):
        UIBaseline.query.filter(
            UIBaseline.project_id == self.project_id,
            UIBaseline.test == self.test,
            UIBaseline.environment == self.environment
        ).delete()
        super().insert()
