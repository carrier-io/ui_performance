from tools import constants as c

RUNNER_MAPPING = {
    'Lighthouse-NPM_V12': f'getcarrier/observer-lighthouse-nodejs:{c.CURRENT_RELEASE}-alpine_v12',
    'Lighthouse-Nodejs': f'getcarrier/observer-lighthouse-nodejs:{c.CURRENT_RELEASE}',
    'Sitespeed v22': f'getcarrier/observer-browsertime:{c.CURRENT_RELEASE}-22.0.0',
    'Sitespeed v33': f'getcarrier/observer-browsertime:{c.CURRENT_RELEASE}-33.0.0'
}