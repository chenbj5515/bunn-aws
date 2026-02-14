export default function Loading() {
    return (
        <div className="top-[38%] left-1/2 absolute -translate-x-1/2 -translate-y-1/2 transform">
            <div
                className="relative w-11 h-11 animate-spinner transform-3d"
            >
                <div className="absolute bg-[rgba(0,77,255,0.2)] border-[#004dff] border-2 w-full h-full transform-[translateZ(-22px)_rotateY(180deg)]"></div>
                <div className="origin-[top_right] absolute bg-[rgba(0,77,255,0.2)] border-[#004dff] border-2 w-full h-full transform-[rotateY(-270deg)_translateX(50%)]"></div>
                <div className="absolute bg-[rgba(0,77,255,0.2)] border-[#004dff] border-2 w-full h-full transform-[rotateY(270deg)_translateX(-50%)] origin-[center_left]"></div>
                <div className="origin-[top_center] absolute bg-[rgba(0,77,255,0.2)] border-[#004dff] border-2 w-full h-full transform-[rotateX(90deg)_translateY(-50%)]"></div>
                <div className="origin-[bottom_center] absolute bg-[rgba(0,77,255,0.2)] border-[#004dff] border-2 w-full h-full transform-[rotateX(-90deg)_translateY(50%)]"></div>
                <div className="absolute bg-[rgba(0,77,255,0.2)] border-[#004dff] border-2 w-full h-full transform-[translateZ(22px)]"></div>
            </div>
        </div>
    );
}