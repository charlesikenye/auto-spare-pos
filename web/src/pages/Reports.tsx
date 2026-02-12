export default function Reports({ user }: { user: any }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Business Reports</h1>
      <p>Performance reports for {user.shopCode}.</p>
    </div>
  );
}
