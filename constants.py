from tools import constants as c

RUNNER_MAPPING = {
    # 'Observer': f'getcarrier/observer:{c.CURRENT_RELEASE}',
    # 'Lighthouse': f'getcarrier/observer-lighthouse:{c.CURRENT_RELEASE}',
    'Lighthouse-Nodejs': f'getcarrier/observer-lighthouse-nodejs:{c.CURRENT_RELEASE}',
    'Lighthouse-NPM': f'getcarrier/observer-lighthouse-nodejs:{c.CURRENT_RELEASE}-alpine',
    'Lighthouse-NPM_V11': f'getcarrier/observer-lighthouse-nodejs:{c.CURRENT_RELEASE}-alpine_v11',
    'Sitespeed (browsertime)': f'getcarrier/observer-browsertime:{c.CURRENT_RELEASE}',
    'Sitespeed (new entrypoint BETA)': f'getcarrier/observer-browsertime:test',
    'Sitespeed (new version BETA)': f'getcarrier/observer-browsertime:latest-33.0.0'
}

if c.LOCAL_DEV:
    RUNNER_MAPPING['Lighthouse local'] = 'getcarrier/observer-lighthouse-nodejs:local'
    RUNNER_MAPPING['Sitespeed local'] = 'getcarrier/observer-browsertime:local'