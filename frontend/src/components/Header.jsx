// src/components/Header.jsx

const Header = () => {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Upwork Jobs Scraper
          </h1>
          <p className="text-sm text-gray-500">
            Find the latest Upwork jobs using custom filters.
          </p>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          Running
        </span>
      </div>
    </header>
  );
};

export default Header;