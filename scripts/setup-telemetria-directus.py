#!/usr/bin/env python3
"""Cria coleção telemetria_eventos e permissões no Directus GMX."""
import datetime
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get('DIRECTUS_URL', 'http://127.0.0.1:8057').rstrip('/')
EMAIL = os.environ.get('DIRECTUS_ADMIN_EMAIL', 'gmx@gmx.com')
PASSWORD = os.environ.get('DIRECTUS_ADMIN_PASSWORD', 'admin123')
ADMIN_POLICY = os.environ.get('DIRECTUS_ADMIN_POLICY', '7fb88d53-685e-41d6-87ef-5f22cc3ff5d8')


def req(method, path, token=None, data=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data is not None else None
    request = urllib.request.Request(BASE + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=60) as res:
            return res.status, json.loads(res.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')


def main():
    _, login = req('POST', '/auth/login', data={'email': EMAIL, 'password': PASSWORD})
    token = login.get('data', {}).get('access_token')
    if not token:
        print('Login falhou:', login)
        sys.exit(1)

    st, col = req('GET', '/collections/telemetria_eventos', token)
    if st != 200:
        req('POST', '/collections', token, {
            'collection': 'telemetria_eventos',
            'meta': {'icon': 'sensors', 'display_template': '{{user_email}} — {{event_type}}'},
            'schema': {'name': 'telemetria_eventos'},
            'fields': [{'field': 'id', 'type': 'integer', 'schema': {'is_primary_key': True, 'has_auto_increment': True}, 'meta': {'hidden': True}}],
        })
        for field, ftype in [
            ('event_type', 'string'), ('tab_id', 'string'), ('tab_state', 'string'),
            ('user_email', 'string'), ('user_name', 'string'), ('directus_user_id', 'string'),
            ('app_user_id', 'integer'), ('current_path', 'string'), ('metadata_json', 'text'),
            ('event_at', 'timestamp'),
        ]:
            req('POST', '/fields/telemetria_eventos', token, {'field': field, 'type': ftype, 'schema': {}, 'meta': {}})

    for action in ['create', 'read', 'update', 'delete']:
        req('POST', '/permissions', token, {
            'collection': 'telemetria_eventos',
            'action': action,
            'policy': ADMIN_POLICY,
            'permissions': {},
            'validation': {},
            'fields': ['*'],
        })

    print('telemetria_eventos OK')


if __name__ == '__main__':
    main()
