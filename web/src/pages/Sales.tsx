export default function Sales({ user }: { user: any }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Sales History</h1>
      <p>Sales records for {user.shopCode} will appear here.</p>
    </div>
  );
}
