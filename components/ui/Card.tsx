type CardProps = {
    children: React.ReactNode;
    className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
    return (
        <div className={`rounded-[2rem] bg-white p-6 shadow-xl ${className}`}>
            {children}
        </div>
    );
}