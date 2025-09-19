.PHONY: help install run clean docker-build docker-run test

help:
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make run        - Run the Streamlit app"
	@echo "  make clean      - Clean cache and temp files"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-run - Run in Docker container"
	@echo "  make test       - Run tests"

install:
	python3 -m venv venv
	./venv/bin/pip install -r requirements.txt

run:
	./venv/bin/streamlit run demo/app.py

clean:
	find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf data/cache/*
	rm -rf .streamlit/*.log

docker-build:
	docker build -t spotify-analysis .

docker-run:
	docker run -p 8501:8501 spotify-analysis

test:
	./venv/bin/python -m pytest tests/