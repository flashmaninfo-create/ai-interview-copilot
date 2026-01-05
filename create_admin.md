# How to Create a Test Admin User

Since password security requires hashing that happens on the server, we cannot directly insert a user with a raw password via SQL.

### Step 1: Sign Up
1. Go to your application's Signup page: `http://localhost:5173/signup`
2. Sign up with these details:
   - **Email**: `admin@interview-master.com`
   - **Password**: `admin123!@#`

### Step 2: Promote to Admin
Once you have signed up, run the following SQL query in your Supabase Dashboard > SQL Editor to promote this user to an admin role:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@interview-master.com';
```

### Step 3: Login
1. Go to `http://localhost:5173/admin`
2. Login with the credentials above.
