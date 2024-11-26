#!/bin/env python
from SuperMuzakBros import create_app, socketio

app = create_app()

app.debug = True

socketio.run(app)
