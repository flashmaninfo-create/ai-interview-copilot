import { useState, useEffect } from 'react';
import { adminService } from '../../lib/services/adminService';
import { Save, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2, MapPin, Clock, Mail } from 'lucide-react';

interface ContactMethod {
    icon: string;
    title: string;
    description: string;
    value: string;
    link: string;
}

interface OfficeLocation {
    city: string;
    address: string;
    region: string;
    country: string;
}

interface BusinessHours {
    weekday: string;
    saturday: string;
    sunday: string;
}

export function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // State for form data
    const [contactMethods, setContactMethods] = useState<ContactMethod[]>([]);
    const [offices, setOffices] = useState<OfficeLocation[]>([]);
    const [hours, setHours] = useState<BusinessHours>({
        weekday: '9:00 AM - 6:00 PM PST',
        saturday: '10:00 AM - 4:00 PM PST',
        sunday: 'Closed'
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            
            // Load configs concurrently
            const [methods, locs, busHours] = await Promise.all([
                adminService.getAppConfig('contact_methods'),
                adminService.getAppConfig('office_locations'),
                adminService.getAppConfig('business_hours')
            ]);

            const parseConfig = (val: any) => {
                if (!val) return null;
                if (typeof val === 'string') {
                    try {
                        return JSON.parse(val);
                    } catch (e) {
                         console.error('Failed to parse config:', e);
                         return null;
                    }
                }
                return val;
            };

            const parsedMethods = parseConfig(methods);
            const parsedLocs = parseConfig(locs);
            const parsedHours = parseConfig(busHours);

            // Set state with fetched data or defaults if null
            if (parsedMethods) {
                setContactMethods(parsedMethods as ContactMethod[]);
            } else {
                // Default values matching original ContactPage
                setContactMethods([
                    {
                        icon: 'EnvelopeIcon',
                        title: 'Email Us',
                        description: 'Our team responds within 24 hours',
                        value: 'support@interviewcopilot.ai',
                        link: 'mailto:support@interviewcopilot.ai',
                    },
                    {
                        icon: 'ChatBubbleLeftRightIcon',
                        title: 'Live Chat',
                        description: 'Available Mon-Fri, 9am-6pm PST',
                        value: 'Start Chat',
                        link: '#',
                    },
                    {
                        icon: 'PhoneIcon',
                        title: 'Call Us',
                        description: 'For urgent enterprise inquiries',
                        value: '+1 (555) 123-4567',
                        link: 'tel:+15551234567',
                    }
                ]);
            }

            if (parsedLocs) {
                setOffices(parsedLocs as OfficeLocation[]);
            } else {
                setOffices([
                    {
                        city: 'San Francisco',
                        address: '123 Market Street, Suite 400',
                        region: 'San Francisco, CA 94103',
                        country: 'United States',
                    },
                    {
                        city: 'New York',
                        address: '456 Broadway, Floor 12',
                        region: 'New York, NY 10013',
                        country: 'United States',
                    },
                    {
                        city: 'London',
                        address: '789 Tech Hub, Shoreditch',
                        region: 'London EC2A 3AY',
                        country: 'United Kingdom',
                    }
                ]);
            }

            if (parsedHours) {
                setHours(parsedHours as BusinessHours);
            }

        } catch (err) {
            console.error('Failed to load settings:', err);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            await Promise.all([
                adminService.setAppConfig('contact_methods', contactMethods),
                adminService.setAppConfig('office_locations', offices),
                adminService.setAppConfig('business_hours', hours)
            ]);

            setMessage({ type: 'success', text: 'Settings saved successfully' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    // --- Helpers for updating state ---

    const updateContactMethod = (index: number, field: keyof ContactMethod, value: string) => {
        const newMethods = [...contactMethods];
        newMethods[index] = { ...newMethods[index], [field]: value };
        setContactMethods(newMethods);
    };

    const updateOffice = (index: number, field: keyof OfficeLocation, value: string) => {
        const newOffices = [...offices];
        newOffices[index] = { ...newOffices[index], [field]: value };
        setOffices(newOffices);
    };

    const addOffice = () => {
        setOffices([...offices, { city: '', address: '', region: '', country: '' }]);
    };

    const removeOffice = (index: number) => {
        setOffices(offices.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Site Settings</h1>
                    <p className="text-muted-foreground">Manage global application settings and contact information</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                    {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    message.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-600' 
                        : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Contact Methods */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm lg:col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <Mail className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Contact Methods</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {contactMethods.map((method, index) => (
                            <div key={index} className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                                    <input 
                                        type="text" 
                                        value={method.title}
                                        onChange={(e) => updateContactMethod(index, 'title', e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Value (Display)</label>
                                    <input 
                                        type="text" 
                                        value={method.value}
                                        onChange={(e) => updateContactMethod(index, 'value', e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link (Href)</label>
                                    <input 
                                        type="text" 
                                        value={method.link}
                                        onChange={(e) => updateContactMethod(index, 'link', e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                                    <input 
                                        type="text" 
                                        value={method.description}
                                        onChange={(e) => updateContactMethod(index, 'description', e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground mt-1"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Office Locations */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold text-foreground">Office Locations</h2>
                        </div>
                        <button 
                            onClick={addOffice}
                            className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 flex items-center gap-1 transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Location
                        </button>
                    </div>

                    <div className="space-y-4">
                        {offices.map((office, index) => (
                            <div key={index} className="relative group bg-muted/30 p-4 rounded-lg border border-border space-y-3">
                                <button 
                                    onClick={() => removeOffice(index)}
                                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Remove location"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-muted-foreground">City</label>
                                        <input 
                                            type="text" 
                                            value={office.city}
                                            onChange={(e) => updateOffice(index, 'city', e.target.value)}
                                            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground">Country</label>
                                        <input 
                                            type="text" 
                                            value={office.country}
                                            onChange={(e) => updateOffice(index, 'country', e.target.value)}
                                            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Address</label>
                                    <input 
                                        type="text" 
                                        value={office.address}
                                        onChange={(e) => updateOffice(index, 'address', e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground">Region / State</label>
                                    <input 
                                        type="text" 
                                        value={office.region}
                                        onChange={(e) => updateOffice(index, 'region', e.target.value)}
                                        className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm text-foreground"
                                    />
                                </div>
                            </div>
                        ))}
                        
                        {offices.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No office locations configured.</p>
                        )}
                    </div>
                </div>

                {/* Business Hours */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Business Hours</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-lg border border-border">
                            <label className="block text-sm font-medium text-foreground mb-1">Monday - Friday</label>
                            <input 
                                type="text" 
                                value={hours.weekday}
                                onChange={(e) => setHours({...hours, weekday: e.target.value})}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border border-border">
                            <label className="block text-sm font-medium text-foreground mb-1">Saturday</label>
                            <input 
                                type="text" 
                                value={hours.saturday}
                                onChange={(e) => setHours({...hours, saturday: e.target.value})}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg border border-border">
                            <label className="block text-sm font-medium text-foreground mb-1">Sunday</label>
                            <input 
                                type="text" 
                                value={hours.sunday}
                                onChange={(e) => setHours({...hours, sunday: e.target.value})}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default AdminSettingsPage;
