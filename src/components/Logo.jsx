// Logo HANOI GO!: ghim đỏ trầm, Khuê Văn Các và rùa đội nón lá (ảnh gốc: logo/hanoi-go-do-tram.png)
export default function Logo({ size = 40 }) {
  return (
    <img className="logo-mark" src={`${import.meta.env.BASE_URL}logo-mark.png`}
      width={size} height={size} alt="" aria-hidden="true" draggable="false" />
  )
}
