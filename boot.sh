#!/bin/bash
exec gunicorn -b :5001 --access-logfile - --error-logfile - --worker-class eventlet -w 1 run:app
