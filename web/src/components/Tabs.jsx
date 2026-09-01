import { useEffect, useId, useRef, useState } from "react";

export default function Tabs({ tabs, defaultTab = 0 }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabListRef = useRef(null);
  const tabsId = useId();

  useEffect(() => {
    const activeButton = tabListRef.current?.querySelector('[aria-selected="true"]');
    activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  const selectTab = (index) => {
    setActiveTab(index);
  };

  const handleKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;

    selectTab(nextIndex);
    tabListRef.current?.querySelectorAll('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div className="w-full overflow-hidden rounded-[inherit] bg-white">
      <div className="relative border-b border-slate-200/80 bg-white">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Page sections"
          className="flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              id={`${tabsId}-tab-${index}`}
              role="tab"
              type="button"
              aria-selected={activeTab === index}
              aria-controls={`${tabsId}-panel-${index}`}
              tabIndex={activeTab === index ? 0 : -1}
              onClick={() => selectTab(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`relative shrink-0 whitespace-nowrap px-4 py-[18px] text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3b71e6] sm:px-5 ${
                activeTab === index
                  ? "text-[#315fd5]"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              {tab.label}
              {activeTab === index && (
                <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-[#3b71e6] sm:inset-x-5" />
              )}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>

      <div
        id={`${tabsId}-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-tab-${activeTab}`}
        className="animate-fadeIn bg-white"
      >
        {tabs[activeTab] && tabs[activeTab].content}
      </div>
    </div>
  );
}
