FROM ubuntu:latest
ENV DEBIAN_FRONTEND=noninteractive

COPY scripts/install.sh /tmp/install.sh
RUN chmod +x /tmp/install.sh && /tmp/install.sh

WORKDIR /app

EXPOSE 5173 3000

CMD ["/bin/bash"]