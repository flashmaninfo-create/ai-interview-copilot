
import { useState, useEffect } from 'react';
import { adminService } from '../../lib/services/adminService';
import { Mail, Search, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface ContactMessage {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    subject: string;
    message: string;
    status: 'read' | 'unread';
    created_at: string;
}

export function AdminMessagesPage() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await adminService.getContactMessages();
            setMessages(data);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Delete this message?')) return;
        try {
            await adminService.deleteMessage(id);
            setMessages(prev => prev.filter(m => m.id !== id));
            if (selectedMessage?.id === id) setSelectedMessage(null);
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    const handleView = async (message: ContactMessage) => {
        setSelectedMessage(message);
        // Mark as read if unread
        if (message.status === 'unread') {
            try {
                await adminService.updateMessageStatus(message.id, 'read');
                setMessages(prev => prev.map(m => 
                    m.id === message.id ? { ...m, status: 'read' } : m
                ));
            } catch (err) {
                console.error('Failed to mark read:', err);
            }
        }
    };

    const filteredMessages = messages.filter(m => 
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.last_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link 
                            to="/admin/dashboard" 
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
                    </div>
                    <p className="text-muted-foreground ml-11">View and manage contact form submissions.</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                    type="text" 
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-foreground focus:outline-none focus:border-primary transition-colors shadow-sm"
                />
            </div>

            {/* Messages List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading messages...</div>
                ) : filteredMessages.length > 0 ? (
                    <div className="divide-y divide-border">
                        {filteredMessages.map(msg => (
                            <div 
                                key={msg.id}
                                onClick={() => handleView(msg)}
                                className={`p-4 flex items-center gap-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                                    msg.status === 'unread' ? 'bg-primary/5' : ''
                                }`}
                            >
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                    msg.status === 'unread' ? 'bg-primary' : 'bg-transparent'
                                }`} />
                                
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                                    <Mail className="w-5 h-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`text-sm font-medium truncate ${
                                            msg.status === 'unread' ? 'text-foreground font-semibold' : 'text-muted-foreground'
                                        }`}>
                                            {msg.first_name} {msg.last_name}
                                        </h3>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(msg.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${
                                        msg.status === 'unread' ? 'text-foreground/90' : 'text-muted-foreground'
                                    }`}>
                                        <span className="font-medium">{msg.subject}</span> - {msg.message}
                                    </p>
                                </div>

                                <button 
                                    onClick={(e) => handleDelete(e, msg.id)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground">
                        <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No messages found.</p>
                    </div>
                )}
            </div>

            {/* Message Detail Modal */}
            {selectedMessage && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedMessage(null)}>
                    <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-foreground mb-1">{selectedMessage.subject}</h2>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{selectedMessage.first_name} {selectedMessage.last_name}</span>
                                    <span>&bull;</span>
                                    <span>&lt;{selectedMessage.email}&gt;</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedMessage(null)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 text-foreground whitespace-pre-wrap leading-relaxed">
                            {selectedMessage.message}
                        </div>

                        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Sent on {new Date(selectedMessage.created_at).toLocaleString()}
                            </span>
                            <div className="flex gap-3">
                                <a 
                                    href={`mailto:${selectedMessage.email}`}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors border border-border"
                                >
                                    Reply via Email
                                </a>
                                <button
                                    onClick={(e) => {
                                        handleDelete(e as any, selectedMessage.id);
                                        setSelectedMessage(null);
                                    }}
                                    className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors border border-destructive/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminMessagesPage;
