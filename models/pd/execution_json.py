from pydantic import BaseModel, validator, AnyUrl, parse_obj_as, root_validator, constr
from typing import Optional


class ExecutionParams(BaseModel):
    _cmd_template = '-sc {entrypoint} -l {loops} -b {browser} -a {aggregation} -tid {test_uid}'

    cmd: str = ''
    additional_files: dict = {}

    env_vars: dict = {}

    class Config:
        fields = {
            'additional_files': 'customization'
        }

    @validator('env_vars', always=True)
    def validate_env_vars(cls, value: dict, values: dict):
        for k in list(value.keys()):
            if k in cls.__fields__:
                values[k] = value[k]
                del value[k]
        return value

    def dict(self, *args, **kwargs) -> dict:
        kwargs['exclude'] = kwargs.get('exclude', set())
        kwargs['exclude'].update({'env_vars'})
        temp = super().dict(*args, **kwargs)
        temp.update(self.env_vars)
        return temp

    @classmethod
    def from_orm(cls, db_object: 'PerformanceApiTest'):
        return cls(**dict(
            cmd=cls._cmd_template.format(
                entrypoint=db_object.entrypoint,
                loops=db_object.loops,
                browser=db_object.browser,
                aggregation=db_object.aggregation,
                test_uid=db_object.test_uid
            ),
            env_vars=db_object.env_vars,
            customization=db_object.customization,
        ))


class CcEnvVars(BaseModel):
    RABBIT_HOST: str = "{{secret.rabbit_host}}"
    RABBIT_USER: str = "{{secret.rabbit_user}}"
    RABBIT_PASSWORD: str = "{{secret.rabbit_password}}"
    GALLOPER_WEB_HOOK: str = "{{secret.post_processor}}"
    RABBIT_VHOST: str = "carrier"
    cc_env_vars: dict = {}

    @validator('cc_env_vars', always=True)
    def validate_env_vars(cls, value: dict, values: dict):
        for k in list(value.keys()):
            if k in cls.__fields__:
                values[k] = value[k]
                del value[k]
        return value

    def dict(self, *args, **kwargs) -> dict:
        kwargs['exclude'] = kwargs.get('exclude', set())
        kwargs['exclude'].update({'cc_env_vars'})
        temp = super().dict(*args, **kwargs)
        temp.update(self.cc_env_vars)
        return temp

    @classmethod
    def from_orm(cls, db_object: 'UIPerformanceTest'):
        public_queues = db_object.rpc.call.get_rabbit_queues("carrier")
        if db_object.location not in public_queues:
            return cls(
                cc_env_vars=db_object.cc_env_vars,
                RABBIT_USER="{{secret.rabbit_project_user}}",
                RABBIT_PASSWORD="{{secret.rabbit_project_password}}",
                RABBIT_VHOST="{{secret.rabbit_project_vhost}}"
            )
        return cls(
            cc_env_vars=db_object.cc_env_vars
        )
