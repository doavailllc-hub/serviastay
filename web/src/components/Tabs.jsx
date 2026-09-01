import { useState } from "react";

export default function Tabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`
                relative px-6 py-4 font-medium text-sm whitespace-nowrap transition-all duration-200
                ${
                  activeTab === index
                    ? "text-[#3b71e6]"
                    : "text-gray-600 hover:text-gray-900"
                }
              `}
            >
              {tab.label}
              {activeTab === index && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#3b71e6] rounded-t" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content with Smooth Transition */}
      <div className="bg-white animate-fadeIn">
        {tabs[activeTab] && tabs[activeTab].content}
      </div>
    </div>
  );
}
