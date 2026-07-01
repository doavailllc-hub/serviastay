import { MessageSquare } from "lucide-react";

export default function AdminSupport() {
  return (
    <main className="rounded-[28px] border border-gray-200 bg-white p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#3b71e6]">
          <MessageSquare size={22} />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Support ticket management will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}