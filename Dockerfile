FROM nginx:1.27-alpine

RUN apk add --no-cache postgresql-client

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY config.template.js /usr/share/nginx/html/config.template.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY db /app/db
COPY . /usr/share/nginx/html

ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 80
