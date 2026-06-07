from mangum import Mangum
from app.main import app

# AWS Lambda Handler Entrypoint
handler = Mangum(app)
