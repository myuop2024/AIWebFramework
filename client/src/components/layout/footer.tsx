import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-6">
      <div className="px-6 py-4 md:flex md:items-center md:justify-between">
        <div className="text-center md:text-left text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} CAFFE Observer Platform. All rights reserved.</p>
        </div>
        <div className="mt-4 md:mt-0 text-center md:text-right text-sm text-gray-500">
          <Link href="/privacy-policy" className="hover:text-gray-700 mr-4">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-gray-700 mr-4">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-gray-700">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
