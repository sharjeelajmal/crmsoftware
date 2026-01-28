"use client";

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { 
    LayoutDashboard, ShoppingCart, Box, Users, UserCheck, 
    BarChart2, RefreshCw, Database, UserCircle, LogOut , ShoppingBag, DollarSign
} from 'lucide-react';

const Sidebar = () => {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        Cookies.remove('auth-token');
        router.push('/login');
    };

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Sales', icon: ShoppingCart, path: '/sales' },
        { name: 'Inventory', icon: Box, path: '/inventory' },
        { name: 'Customers', icon: Users, path: '/customers' },
        { name: 'Salesman', icon: UserCheck, path: '/salesman' },
        { name: 'Purchasing', icon: ShoppingBag, path: '/purchasing' },
        // New 'Expenses' item added here
        { name: 'Expenses', icon: DollarSign, path: '/expenses' }, 
        { name: 'Analytics', icon: BarChart2, path: '/analytics' },
        { name: 'Recovery', icon: RefreshCw, path: '/recovery' },
        { name: 'Backup', icon: Database, path: '/backup' },
    ];

    return (
        <div className="flex flex-col h-full bg-white text-gray-800 rounded-2xl p-4 shadow-lg">
            <div className="flex-grow">
                <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 pl-3">Menu</h2>
                <ul>
                    {menuItems.map((item) => (
                        <li key={item.name}>
                            <Link href={item.path} className={`transform transition-all duration-300 flex items-center p-3 my-2 rounded-lg cursor-pointer
                                ${pathname === item.path 
                                    ? 'bg-[#0D3A25] text-white shadow-lg' 
                                    : 'bg-white hover:bg-gray-50 hover:shadow-xl'
                                }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="ml-4 font-medium">{item.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 pl-3">Other</h2>
                <ul>
                    <li>
                        <Link href="/profile" className={`transform transition-all duration-300 flex items-center p-3 my-2 rounded-lg cursor-pointer ${pathname === '/profile' ? 'bg-[#0D3A25] text-white shadow-lg' : 'bg-white hover:bg-gray-50 hover:shadow-xl'}`}>
                            <UserCircle className="w-5 h-5" />
                            <span className="ml-4 font-medium">Profile</span>
                        </Link>
                    </li>
                    <li 
                        onClick={handleLogout}
                        className="transform transition-all duration-300 flex items-center p-3 my-2 rounded-lg cursor-pointer bg-white hover:bg-gray-50 hover:shadow-xl text-red-600"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="ml-4 font-medium">Log Out</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default Sidebar;

//End