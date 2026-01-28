"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Mail, Phone, Lock, Edit, Save, ShieldCheck, 
    CheckCircle, AlertTriangle, X, Camera, Eye, EyeOff // Eye icons import kiye gaye hain
} from 'lucide-react';
import Image from 'next/image';
import Loader from '@/components/Loader';

// --- Reusable Components ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

const InputField = ({ icon: Icon, type, placeholder, value, name, onChange, disabled = false }) => (
    <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type={type} placeholder={placeholder} value={value} name={name} onChange={onChange} disabled={disabled}
            className="w-full p-3 pl-12 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#0D3A25] transition-all disabled:bg-gray-200 disabled:cursor-not-allowed"
        />
    </div>
);

// --- *** NAYA PASSWORD INPUT COMPONENT *** ---
// Yeh component password visibility ko handle karega
const PasswordInputField = ({ icon: Icon, placeholder, value, name, onChange }) => {
    const [isVisible, setIsVisible] = useState(false);
    const toggleVisibility = () => setIsVisible(!isVisible);
    const InputIcon = isVisible ? EyeOff : Eye;

    return (
        <div className="relative">
            <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type={isVisible ? "text" : "password"} 
                placeholder={placeholder} 
                value={value} 
                name={name} 
                onChange={onChange}
                className="w-full p-3 pl-12 pr-12 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#0D3A25] transition-all"
            />
            <button 
                type="button" // Form submit hone se rokein
                onClick={toggleVisibility}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0D3A25] cursor-pointer"
                aria-label={isVisible ? "Hide password" : "Show password"}
            >
                <InputIcon size={20} />
            </button>
        </div>
    );
};
// --- *** END NAYA COMPONENT *** ---


const NotificationPopup = ({ message, type, onClose }) => (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-5 right-5 bg-white p-4 rounded-xl shadow-lg flex items-center gap-4 z-[9999]">
        {type === 'success' ? <CheckCircle className="text-green-500" size={24} /> : <AlertTriangle className="text-red-500" size={24} />}
        <p className="font-semibold text-gray-800">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
    </motion.div>
);


export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [notification, setNotification] = useState({ visible: false, message: '', type: '' });
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/profile');
                const data = await res.json();
                setProfile(data);
            } catch (error) { console.error("Failed to fetch profile:", error); } 
            finally { setIsLoading(false); }
        };
        fetchProfile();
    }, []);

    const showNotification = (message, type) => {
        setNotification({ visible: true, message, type });
        setTimeout(() => setNotification({ visible: false, message: '', type: '' }), 3000);
    };

    const handleInputChange = (e) => setProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePasswordChange = (e) => {
        setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveProfile = async () => {
        const { _id, ...profileData } = profile; 
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            if (!res.ok) throw new Error('Update failed');
            showNotification('Profile updated successfully!', 'success');
            setIsEditing(false);
        } catch (error) {
            showNotification('Error updating profile.', 'error');
        }
    };
    
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => ({ ...prev, avatar: reader.result }));
                setIsEditing(true); 
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdatePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showNotification('New password and confirm password do not match.', 'error');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            showNotification('Password must be at least 6 characters long.', 'error');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const res = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update password');
            }

            showNotification('Password updated successfully!', 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    if (isLoading) return <Loader />;

    return (
        <>
            <AnimatePresence>
                {notification.visible && <NotificationPopup message={notification.message} type={notification.type} onClose={() => setNotification({ visible: false, message: '', type: '' })} />}
            </AnimatePresence>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 max-w-4xl mx-auto">
                <motion.div variants={itemVariants} className="flex flex-col items-center">
                    <div className="relative group">
                        <Image src={profile.avatar} alt="Profile" width={120} height={120} className="rounded-full shadow-lg border-4 border-white object-cover w-32 h-32"/>
                        <button onClick={() => fileInputRef.current.click()} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera size={32} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*"/>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mt-4">{profile.name}</h1>
                    <p className="text-gray-500">{profile.role}</p>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
                        <button onClick={() => { if (isEditing) handleSaveProfile(); else setIsEditing(true); }} className="flex items-center gap-2 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-300 transform hover:scale-105 bg-[#0D3A25] cursor-pointer">
                            {isEditing ? <Save size={16} /> : <Edit size={16} />}
                            {isEditing ? 'Save' : 'Edit'}
                        </button>
                    </div>
                    <div className="space-y-4">
                        <InputField icon={User} type="text" placeholder="Full Name" name="name" value={profile.name} onChange={handleInputChange} disabled={!isEditing} />
                        <InputField icon={Mail} type="email" placeholder="Email Address" name="email" value={profile.email} onChange={handleInputChange} disabled={!isEditing} />
                        <InputField icon={Phone} type="tel" placeholder="Phone Number" name="phone" value={profile.phone} onChange={handleInputChange} disabled={!isEditing} />
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white p-8 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Change Password</h2>
                    <div className="space-y-4">
                        {/* --- InputField ko PasswordInputField se replace kar diya gaya hai --- */}
                        <PasswordInputField 
                            icon={Lock} 
                            placeholder="Current Password" 
                            name="currentPassword" 
                            value={passwordData.currentPassword} 
                            onChange={handlePasswordChange}
                        />
                        <PasswordInputField 
                            icon={Lock} 
                            placeholder="New Password" 
                            name="newPassword" 
                            value={passwordData.newPassword} 
                            onChange={handlePasswordChange}
                        />
                        <PasswordInputField 
                            icon={Lock} 
                            placeholder="Confirm New Password" 
                            name="confirmPassword" 
                            value={passwordData.confirmPassword} 
                            onChange={handlePasswordChange}
                        />
                    </div>
                    <div className="flex justify-end mt-6">
                        <button 
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword}
                            className="flex items-center gap-2 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 bg-[#0D3A25] cursor-pointer disabled:opacity-50"
                        >
                            <ShieldCheck size={18} /> 
                            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </>
    );
}