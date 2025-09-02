FROM python:3.12

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

COPY . .
RUN chmod a+x boot.sh

ENV FLASK_APP=SuperMuzakBros:create_app

EXPOSE 5001

CMD ["./boot.sh"]
