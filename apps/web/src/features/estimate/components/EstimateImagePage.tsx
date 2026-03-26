interface EstimateImagePageProps {
  imageSrc: string;
  ariaLabel: string;
}

export function EstimateImagePage({ imageSrc, ariaLabel }: EstimateImagePageProps): JSX.Element {
  return (
    <section className="estimate-sheet estimate-sheet-page-image estimate-sheet-full-page-image" aria-label={ariaLabel}>
      <img className="estimate-full-page-image" src={imageSrc} alt="" draggable={false} />
    </section>
  );
}
