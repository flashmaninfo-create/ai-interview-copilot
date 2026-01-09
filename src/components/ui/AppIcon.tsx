import React from 'react';
import {
    HelpCircle,
    Users,
    BarChart3,
    Globe,
    Star,
    Heart,
    ShieldCheck,
    GraduationCap,
    Lock,
    Trophy,
    Building2,
    Mail,
    MessageCircle,
    Phone,
    MapPin,
    Clock,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    ArrowRight,
    Check,
    CheckCircle,
    X,
    XCircle,
    AlertCircle,
    AlertTriangle,
    Info,
    Eye,
    EyeOff,
    Scale,
    Lightbulb,
    Flag,
    Send,
    Sparkles,
    Zap,
    Settings,
    FileText,
    Camera,
    Play,
    PlayCircle,
    Search,
    Calendar,
    Bookmark,
    Share2,
    ExternalLink,
    Hand,
} from 'lucide-react';

type IconVariant = 'outline' | 'solid';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    name: string;
    variant?: IconVariant;
    size?: number;
    className?: string;
    disabled?: boolean;
}

// Map Heroicons names to lucide-react components
const iconMap: Record<string, React.ComponentType<any>> = {
    // User & People
    'UserGroupIcon': Users,
    'UsersIcon': Users,
    
    // Charts & Analytics
    'ChartBarIcon': BarChart3,
    'ChartBarSquareIcon': BarChart3,
    
    // Globe
    'GlobeAltIcon': Globe,
    'GlobeAmericasIcon': Globe,
    
    // Star
    'StarIcon': Star,
    
    // Heart
    'HeartIcon': Heart,
    
    // Shield & Security
    'ShieldCheckIcon': ShieldCheck,
    'ShieldExclamationIcon': ShieldCheck,
    
    // Academic
    'AcademicCapIcon': GraduationCap,
    
    // Lock
    'LockClosedIcon': Lock,
    'LockOpenIcon': Lock,
    
    // Trophy
    'TrophyIcon': Trophy,
    
    // Building
    'BuildingOfficeIcon': Building2,
    'BuildingOffice2Icon': Building2,
    
    // Communication
    'EnvelopeIcon': Mail,
    'ChatBubbleLeftRightIcon': MessageCircle,
    'ChatBubbleLeftEllipsisIcon': MessageCircle,
    'ChatBubbleBottomCenterTextIcon': MessageCircle,
    'PhoneIcon': Phone,
    
    // Navigation & Location
    'MapPinIcon': MapPin,
    
    // Time
    'ClockIcon': Clock,
    
    // Chevrons & Arrows
    'ChevronDownIcon': ChevronDown,
    'ChevronUpIcon': ChevronUp,
    'ChevronRightIcon': ChevronRight,
    'ArrowRightIcon': ArrowRight,
    
    // Checks & Status
    'CheckIcon': Check,
    'CheckCircleIcon': CheckCircle,
    'XMarkIcon': X,
    'XCircleIcon': XCircle,
    'ExclamationCircleIcon': AlertCircle,
    'ExclamationTriangleIcon': AlertTriangle,
    'InformationCircleIcon': Info,
    
    // View
    'EyeIcon': Eye,
    'EyeSlashIcon': EyeOff,
    
    // Misc
    'ScaleIcon': Scale,
    'LightBulbIcon': Lightbulb,
    'FlagIcon': Flag,
    'PaperAirplaneIcon': Send,
    'SparklesIcon': Sparkles,
    'BoltIcon': Zap,
    'CogIcon': Settings,
    'DocumentTextIcon': FileText,
    'CameraIcon': Camera,
    'PlayIcon': Play,
    'PlayCircleIcon': PlayCircle,
    'MagnifyingGlassIcon': Search,
    'CalendarIcon': Calendar,
    'BookmarkIcon': Bookmark,
    'ShareIcon': Share2,
    'ArrowTopRightOnSquareIcon': ExternalLink,
    'QuestionMarkCircleIcon': HelpCircle,
    'HandRaisedIcon': Hand,
};

/**
 * AppIcon - A wrapper component that maps Heroicon names to lucide-react icons.
 * Falls back to HelpCircle when icon cannot be found.
 */
function Icon({
    name,
    variant = 'outline',
    size = 24,
    className = '',
    onClick,
    disabled = false,
    ...props
}: IconProps) {
    const IconComponent = iconMap[name] || HelpCircle;
    
    // Note: lucide-react doesn't have outline/solid variants like Heroicons
    // The variant prop is kept for backwards compatibility but does not affect rendering
    
    return (
        <IconComponent
            width={size}
            height={size}
            className={`${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
            onClick={disabled ? undefined : onClick}
            {...(props as any)}
        />
    );
}

export default Icon;
