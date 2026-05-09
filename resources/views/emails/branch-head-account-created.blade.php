<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Branch Head Account Created</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
    <h2 style="margin-bottom: 8px;">Welcome to System Dealer Management</h2>
    <p style="margin-top: 0;">Your branch head account has been created.</p>

    <p><strong>Branch:</strong> {{ $branch->name }}</p>
    <p><strong>Name:</strong> {{ $branchHead->name }}</p>
    <p><strong>Email:</strong> {{ $branchHead->email }}</p>
    <p><strong>Temporary Password:</strong> {{ $plainPassword }}</p>

    <p>Please log in and change your password immediately.</p>
</body>
</html>
