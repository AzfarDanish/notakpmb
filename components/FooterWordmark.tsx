export function FooterWordmark() {
  return (
    <div
      aria-hidden="true"
      className="relative mt-4 w-full max-w-full overflow-hidden bg-white pt-2 md:mt-8 md:pt-4"
    >
      <div className="relative pointer-events-none h-[clamp(4rem,18vw,22rem)] w-full max-w-full overflow-hidden whitespace-nowrap text-[clamp(5rem,24vw,28rem)] font-black uppercase leading-[0.76] tracking-[-0.12em] text-ink">
        <span className="absolute left-1/2 block -translate-x-1/2 translate-y-[18%] md:translate-y-[22%]">
          NOTAKPMB
        </span>
      </div>
    </div>
  )
}
