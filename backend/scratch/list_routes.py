from app.main import app

def list_routes():
    for route in app.routes:
        print(f"Path: {route.path}, Methods: {route.methods}, Name: {route.name}")

if __name__ == "__main__":
    list_routes()
