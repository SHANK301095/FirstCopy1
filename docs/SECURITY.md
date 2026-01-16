# Security

- RBAC enforced via role checks in server routes.
- Rate limiting for auth + checkout endpoints (checkout stub added).
- Validation with Zod on inbound payloads.
- Audit logging for admin actions (scaffolded).
- Secure uploads placeholder: file type/size checks + signed URL stub.
- RBAC roles: USER / ADMIN.
- Rate limiting on auth endpoint (in-memory).
- Input validation with Zod on admin APIs.
- Audit logs model ready for future admin action logging.
- Secure upload placeholder: use signed URLs + virus scan integration when adding file uploads.
