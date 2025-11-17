#!/bin/bash

# ==================================================
# AI MUTUALS BACKEND - QUICK START SCRIPT
# ==================================================
# This script helps you set up and run the backend quickly
# ==================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print with color
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}\n"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 20.x or higher."
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker installed: $DOCKER_VERSION"
    else
        print_warning "Docker not found. Docker is recommended but optional."
    fi
    
    # Check MongoDB (optional for local dev)
    if command -v mongod &> /dev/null; then
        print_success "MongoDB installed locally"
    else
        print_warning "MongoDB not found locally. You can use MongoDB Atlas or Docker."
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    if [ -f "package.json" ]; then
        print_info "Installing npm packages..."
        npm install
        print_success "Dependencies installed successfully"
    else
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
}

# Setup environment
setup_environment() {
    print_header "Setting Up Environment"
    
    if [ -f ".env" ]; then
        print_warning ".env file already exists. Skipping..."
    else
        if [ -f ".env.comprehensive" ]; then
            print_info "Copying comprehensive .env template..."
            cp .env.comprehensive .env
            print_success ".env file created from comprehensive template"
        elif [ -f ".env.example" ]; then
            print_info "Copying .env.example..."
            cp .env.example .env
            print_success ".env file created"
        else
            print_error "No .env template found!"
            exit 1
        fi
        
        print_warning "⚠️  IMPORTANT: You need to edit .env file with your API keys and database URL"
        print_info "Run: nano .env  or  code .env"
    fi
}

# Start with Docker
start_with_docker() {
    print_header "Starting with Docker Compose"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    print_info "Starting services (MongoDB, Redis, Backend, Worker, Scheduler)..."
    docker-compose -f docker-compose.production.yml up -d
    
    print_success "Docker services started!"
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    if curl -f http://localhost:3002/health &> /dev/null; then
        print_success "Backend is healthy!"
    else
        print_warning "Backend might still be starting... Check logs with:"
        print_info "docker-compose logs -f"
    fi
}

# Start without Docker
start_without_docker() {
    print_header "Starting Without Docker"
    
    # Check if .env has MongoDB URL
    if ! grep -q "DATABASE_URL" .env; then
        print_error ".env file is missing DATABASE_URL"
        print_info "Please add your MongoDB connection string to .env"
        exit 1
    fi
    
    print_info "Building TypeScript..."
    npm run build
    
    print_info "Starting backend server..."
    npm start &
    
    print_success "Backend started in background!"
    print_info "View logs in the terminal or check logs/ directory"
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    print_info "Running test suite..."
    npm test
    
    print_success "Tests completed!"
}

# Display info
display_info() {
    print_header "Setup Complete! 🎉"
    
    echo -e "${GREEN}Your AI Mutuals Backend is ready!${NC}\n"
    
    echo -e "${BLUE}📍 API Endpoints:${NC}"
    echo "   Health:     http://localhost:3002/health"
    echo "   Test:       http://localhost:3002/api/test"
    echo "   Funds:      http://localhost:3002/api/funds"
    echo "   ML API:     http://localhost:3002/api/ml/smart-score"
    echo "   AI Chat:    http://localhost:3002/api/ai/chat"
    echo ""
    
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "   View logs:          docker-compose logs -f"
    echo "   Stop services:      docker-compose down"
    echo "   Restart:            docker-compose restart"
    echo "   Run tests:          npm test"
    echo "   Development mode:   npm run dev"
    echo ""
    
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "   Full API docs:      README.comprehensive.md"
    echo "   Setup guide:        SETUP_GUIDE.md"
    echo "   Implementation:     IMPLEMENTATION_SUMMARY.md"
    echo ""
    
    echo -e "${BLUE}🔗 Admin UIs (if using Docker with --profile tools):${NC}"
    echo "   Mongo Express:      http://localhost:8081"
    echo "   Redis Commander:    http://localhost:8082"
    echo ""
    
    print_warning "⚠️  Don't forget to:"
    echo "   1. Add your API keys to .env file"
    echo "   2. Update DATABASE_URL in .env"
    echo "   3. Test the endpoints"
    echo "   4. Connect your frontend"
}

# Test API
test_api() {
    print_header "Testing API Endpoints"
    
    print_info "Testing health endpoint..."
    if curl -f http://localhost:3002/health &> /dev/null; then
        print_success "Health endpoint working!"
    else
        print_error "Health endpoint failed. Is the server running?"
    fi
    
    print_info "Testing test endpoint..."
    if curl -f http://localhost:3002/api/test &> /dev/null; then
        print_success "Test endpoint working!"
    else
        print_warning "Test endpoint failed."
    fi
}

# Main menu
show_menu() {
    print_header "AI MUTUALS BACKEND - QUICK START"
    
    echo "Please choose an option:"
    echo ""
    echo "1) Full Setup (Check → Install → Configure → Start with Docker)"
    echo "2) Quick Start with Docker (Recommended)"
    echo "3) Quick Start without Docker"
    echo "4) Just Install Dependencies"
    echo "5) Just Setup .env File"
    echo "6) Run Tests"
    echo "7) Test API Endpoints"
    echo "8) Display Info Only"
    echo "9) Exit"
    echo ""
    read -p "Enter your choice [1-9]: " choice
}

# Main script
main() {
    case $choice in
        1)
            check_prerequisites
            install_dependencies
            setup_environment
            start_with_docker
            display_info
            ;;
        2)
            start_with_docker
            test_api
            display_info
            ;;
        3)
            start_without_docker
            test_api
            display_info
            ;;
        4)
            install_dependencies
            ;;
        5)
            setup_environment
            ;;
        6)
            run_tests
            ;;
        7)
            test_api
            ;;
        8)
            display_info
            ;;
        9)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid option. Please choose 1-9."
            exit 1
            ;;
    esac
}

# Run the script
show_menu
main

print_success "Script completed! 🚀"
