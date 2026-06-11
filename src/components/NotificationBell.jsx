import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../config/api';

export default function NotificationBell({ userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      // THE REAL API CALL
      const res = await apiFetch(`get_notifications`);
      if (res.status === 'success') {
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => n.is_read == 0).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Silently check for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id = 'all') => {
    // 1. Update UI Instantly (Optimistic update for speed)
    if (id === 'all') {
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } else {
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // 2. Tell the Backend in the background
    await apiFetch('mark_notifications_read', { 
      method: 'POST', 
      body: JSON.stringify({ id }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    
    // ACTION ROUTING LOGIC
    switch (notif.type) {
      case 'stock_alert':
      case 'out_of_stock':
      case 'restock_request':
        navigate(`/inventory?product_id=${notif.reference_id}`);
        break;

      case 'debt_due':
      case 'debt_overdue':
        navigate(`/credits?transaction_id=${notif.reference_id}`);
        break;

      case 'shift_warning':
        navigate(`/shift-analytics?shift_id=${notif.reference_id}`); 
        break;

      default:
        break;
    }
  };

  // Helper to pick the right icon and color based on alert type
  const getIcon = (type) => {
    switch(type) {
      case 'stock_alert':
      case 'low_stock':
      case 'out_of_stock':
      case 'restock_request':
        return <div className="p-2 bg-orange-100 text-orange-600 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>;
      
      case 'debt_due':
      case 'debt_overdue':
      case 'debt_reminder':
        return <div className="p-2 bg-red-100 text-red-600 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>;
      
      case 'shift_warning':
        return <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>;
      
      default:
        return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* THE BELL BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

        {/* THE DROPDOWN PANEL */}
          <div 
            className={`absolute -right-20 sm:right-0 mt-2 w-[calc(100vw-2rem)] max-w-[360px] sm:max-w-none sm:w-80 lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-[100] overflow-hidden origin-top-right transition-all duration-300 ease-out ${
              isOpen 
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" 
                : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            }`}
          >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={() => markAsRead('all')} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm font-medium">
                No new notifications
              </div>
            ) : (
              notifications.map(notif => (
                <button 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${notif.is_read === 0 ? 'bg-blue-50/30' : 'bg-white opacity-70'}`}
                >
                  <div className="shrink-0 mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <p className={`text-xs ${notif.is_read === 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 mt-1 block">
                      {notif.created_at}
                    </span>
                  </div>
                  {notif.is_read === 0 && <div className="w-2 h-2 rounded-full bg-blue-600 self-center shrink-0"></div>}
                </button>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <button className="w-full py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              View all history
            </button>
          </div>
        </div>  
    </div>
  );
}