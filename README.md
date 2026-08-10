# American Eagle Freight — Full Admin + Customer Tracking System

## What is included
- Node.js/Express server
- SQLite database
- Admin login with session authentication
- Admin dashboard
- Create shipments
- Automatically generated AEF tracking numbers
- Update shipment status/location/estimated delivery
- Delete shipments
- Customer tracking page
- Shipment event timeline
- Responsive pages

## Run on a computer
1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:
   npm install
4. Set secure environment variables before using it:
   - ADMIN_USERNAME=your-admin-name
   - ADMIN_PASSWORD=your-long-random-password
   - SESSION_SECRET=your-long-random-secret
5. Start:
   npm start
6. Open:
   http://localhost:3000
   Admin: http://localhost:3000/admin
   Customer tracking: http://localhost:3000/track

## Demo login
For local testing only, if you do not set environment variables:
Username: admin
Password: ChangeMe123!

CHANGE THIS PASSWORD BEFORE DEPLOYMENT.

## Demo shipment
Tracking number: AEF123456789

## Free/low-cost hosting
This is a Node.js server application, so it cannot be hosted on ordinary static GitHub Pages alone. Use a hosting provider that supports Node.js and persistent storage, or deploy the application with a managed database.

SQLite is suitable for a simple/local demo. For production, use a managed database and secure secrets.

## Security
- Never hard-code a real production password.
- Use HTTPS in production.
- Use a strong SESSION_SECRET.
- Consider rate limiting, CSRF protection, stronger authentication and audit logs for production.
- Do not store sensitive customer information unless you have an appropriate privacy/security setup.
- Only publish legitimate shipment information. The included shipment is clearly a demo.

## Business details
American Eagle Freight
Washington, DC
+1 (201) 212-9528
americaneaglefreight50@gmail.com
