FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY logo-viscofan.png /usr/share/nginx/html/logo-viscofan.png

EXPOSE 80
