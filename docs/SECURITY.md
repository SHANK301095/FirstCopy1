# Security

- RBAC roles: USER / ADMIN.
- Rate limiting on auth endpoint (in-memory).
- Input validation with Zod on admin APIs.
- Audit logs model ready for future admin action logging.
- Secure upload placeholder: use signed URLs + virus scan integration when adding file uploads.
