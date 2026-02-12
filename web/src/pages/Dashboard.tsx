export default function Dashboard({ user }: { user: any }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {user.name}. You are logged into {user.shopCode}.</p>
    </div>
  );
}
