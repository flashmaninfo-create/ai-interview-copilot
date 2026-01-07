import React, { useState } from 'react';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    width?: number | string;
    height?: number | string;
    className?: string;
    priority?: boolean;
    quality?: number;
    placeholder?: 'blur' | 'empty';
    blurDataURL?: string;
    fill?: boolean;
    sizes?: string;
    fallbackSrc?: string;
}

function AppImage({
    src,
    alt,
    width,
    height,
    className = '',
    priority = false, // Ignored in Vite/standard img
    quality = 75, // Ignored
    placeholder = 'empty', // Ignored
    blurDataURL, // Ignored
    fill = false,
    sizes, // Ignored unless using srcSet (not implemented here for simplicity)
    onClick,
    fallbackSrc = '/assets/images/no_image.png',
    style,
    ...props
}: AppImageProps) {
    const [imageSrc, setImageSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        if (!hasError && imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
            setHasError(true);
        }
        setIsLoading(false);
        if (props.onError) props.onError(e);
    };

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoading(false);
        setHasError(false);
        if (props.onLoad) props.onLoad(e);
    };

    const commonClassName = `${className} ${isLoading ? 'bg-gray-200' : ''} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`;

    if (fill) {
        return (
            <div className={`relative ${className}`} style={{ width: width || '100%', height: height || '100%', ...style }}>
                <img
                    src={imageSrc}
                    alt={alt}
                    className={`${commonClassName} absolute inset-0 w-full h-full object-cover`}
                    onError={handleError}
                    onLoad={handleLoad}
                    onClick={onClick}
                    {...props}
                />
            </div>
        );
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            className={commonClassName}
            onError={handleError}
            onLoad={handleLoad}
            onClick={onClick}
            style={style}
            {...props}
        />
    );
}

export default AppImage;
