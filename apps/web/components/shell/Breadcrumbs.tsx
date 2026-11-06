import styles from './shell.module.css';

export type ShellBreadcrumb = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: ShellBreadcrumb[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs} data-control-id="SHELL-breadcrumb">
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li className={styles.breadcrumbItem} key={`${item.label}-${index}`}>
              {index === 0 ? null : (
                <span className={styles.breadcrumbSeparator} aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <strong className={styles.breadcrumbCurrent} aria-current="page">
                  {item.label}
                </strong>
              ) : item.href ? (
                <a className={styles.breadcrumbLink} href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span className={styles.breadcrumbText}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
