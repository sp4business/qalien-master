export default function TestLoginPage() {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <div className="bg-white px-8 py-6">
        <h1 className="text-2xl font-semibold text-black">QAlien</h1>
      </div>

      {/* Test Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#1A1F2E] rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-semibold text-white text-center mb-2">Test Login Page</h2>
          <p className="text-gray-400 text-center mb-8">This is a test to see if the page renders</p>
          
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Test email input"
              className="w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg"
            />
            <button className="w-full py-3 bg-[#4C9BF5] text-white rounded-lg">
              Test Button
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}