# Database Schema

## Users
- `id` (uuid)
- `username` (text)
- `email` (text) — unique
- `password` (varchar) — stores bcrypt-hashed password (previously `password_hash`)
- `role` (varchar)
- `full_name` (text)
- `is_active` (boolean)