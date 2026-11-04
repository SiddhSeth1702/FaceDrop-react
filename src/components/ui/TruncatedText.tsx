import React from 'react';

interface TruncatedTextProps {
    text: string;
    maxLength: number;
    className?: string;
    showTooltip?: boolean;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
    text,
    maxLength,
    className = "",
    showTooltip = true
}) => {
    const shouldTruncate = text.length > maxLength;
    const displayText = shouldTruncate ? text.substring(0, maxLength) + "..." : text;

    if (!shouldTruncate || !showTooltip) {
        return <span className={className}>{displayText}</span>;
    }

    return (
        <span
            className={`${className} cursor-pointer`}
            title={text}
        >
            {displayText}
        </span>
    );
};

export default TruncatedText;
