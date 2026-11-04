const SendIcon = ({ color }: { color: string | null }) => {
  return (
    <div>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          width="32"
          height="32"
          rx="16"
          fill={`${color ? color : "#E8E8E8"}`}
        />
        <mask
          id="mask0_14003_92307"
          maskUnits="userSpaceOnUse"
          x="4"
          y="4"
          width="24"
          height="24"
        >
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            fill={`${color ? "#ffffff" : "#D9D9D9"}`}
          />
        </mask>
        <g mask="url(#mask0_14003_92307)">
          <path
            d="M10.7665 22.7233C10.4645 22.8439 10.1779 22.8183 9.90675 22.6463C9.63558 22.4743 9.5 22.2238 9.5 21.8948V17.6735L16.423 16.0005L9.5 14.3275V10.1063C9.5 9.77725 9.63558 9.52675 9.90675 9.35475C10.1779 9.18275 10.4645 9.15709 10.7665 9.27775L24.723 15.162C25.0948 15.3285 25.2807 15.6086 25.2807 16.0023C25.2807 16.3959 25.0948 16.6748 24.723 16.839L10.7665 22.7233Z"
            fill="white"
          />
        </g>
      </svg>
    </div>
  );
};

export default SendIcon;
