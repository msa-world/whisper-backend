# Use a lightweight Python base image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen

# Copy the rest of the application code
COPY . .

# Ensure start.sh is executable
RUN chmod +x start.sh

# Expose the port (Hugging Face uses 7860 by default)
EXPOSE 7860
ENV PORT=7860

# Run the unified startup script
CMD ["bash", "start.sh"]
