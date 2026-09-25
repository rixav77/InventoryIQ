import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Badge, Empty } from './ui';
import type { Tone } from './ui';

export interface SearchOption {
  id: string;
  /** Monospaced identifier shown first. */
  primary: string;
  secondary: string;
  badges?: readonly { label: string; tone: Tone }[];
  /** Right-aligned figure, usually the number that matters for this section. */
  figure?: string;
}

interface Props {
  /** Everything selectable in this section. */
  options: readonly SearchOption[];
  /** Shown before the operator types. Defaults to `options`. */
  suggested?: readonly SearchOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  suggestedLabel?: string;
  placeholder?: string;
  ariaLabel?: string;
  emptyTitle?: string;
  emptyBody?: string;
  /** Small helper node rendered at the end of the field. */
  hint?: ReactNode;
}

function haystack(option: SearchOption): string {
  return [
    option.primary,
    option.secondary,
    option.figure ?? '',
    ...(option.badges ?? []).map((badge) => badge.label),
  ]
    .join(' ')
    .toLowerCase();
}

export function SkuSearch({
  options,
  suggested,
  selectedId,
  onSelect,
  suggestedLabel = 'Suggested',
  placeholder = 'Search a SKU',
  ariaLabel = 'Search SKUs',
  emptyTitle = 'No SKU matches',
  emptyBody = 'Nothing in the available data matches that search.',
  hint,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;
  const optionId = (id: string): string => `${uid}-opt-${id}`;

  useEffect(() => {
    const chosen = options.find((option) => option.id === selectedId);
    if (chosen !== undefined) {
      setQuery(chosen.primary);
    }
  }, [options, selectedId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      if (wrapperRef.current !== null && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  // While the field is simply showing the current selection, the dropdown should
  // still offer every SKU this section has data for, not just the chosen one.
  const selectedPrimary = options.find((option) => option.id === selectedId)?.primary ?? '';
  const pristine = query === selectedPrimary;
  const needle = pristine ? '' : query.trim().toLowerCase();
  const visible =
    needle === ''
      ? (suggested ?? options)
      : options.filter((option) => haystack(option).includes(needle));

  const select = useCallback(
    (id: string) => {
      const chosen = options.find((option) => option.id === id);
      onSelect(id);
      if (chosen !== undefined) {
        setQuery(chosen.primary);
      }
      setOpen(false);
      inputRef.current?.blur();
    },
    [onSelect, options],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, visible.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      const pick = visible[activeIndex];
      if (pick !== undefined) {
        event.preventDefault();
        select(pick.id);
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Home') {
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      setActiveIndex(Math.max(visible.length - 1, 0));
    }
  };

  return (
    <div className="search" ref={wrapperRef}>
      <div className="search-field">
        <span className="search-icon" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.6 12.6 17 17" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && visible[activeIndex] !== undefined ? optionId(visible[activeIndex]?.id ?? '') : undefined
          }
          aria-label={ariaLabel}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onKeyDown={handleKeyDown}
        />
        {query === '' ? (
          hint === undefined ? null : (
            <span className="search-hint">{hint}</span>
          )
        ) : (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              setQuery('');
              setActiveIndex(0);
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            Clear
          </button>
        )}
      </div>

      {open ? (
        <div className="search-results" id={listId} role="listbox" aria-label="SKU matches">
          <div className="search-results-head">
            <span>{needle === '' ? suggestedLabel : 'Matching SKUs'}</span>
            <span>
              {visible.length} of {options.length}
            </span>
          </div>
          {visible.length === 0 ? (
            <div className="search-empty">
              <Empty title={emptyTitle} body={emptyBody} />
            </div>
          ) : (
            visible.map((option, index) => (
              <button
                key={option.id}
                type="button"
                id={optionId(option.id)}
                role="option"
                aria-selected={option.id === selectedId}
                tabIndex={-1}
                className={`search-option${index === activeIndex ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option.id)}
              >
                <span className="search-option-main">
                  <span className="search-option-sku">{option.primary}</span>
                  <span className="search-option-sub">{option.secondary}</span>
                </span>
                <span className="search-option-meta">
                  {(option.badges ?? []).map((badge) => (
                    <Badge key={badge.label} tone={badge.tone}>
                      {badge.label}
                    </Badge>
                  ))}
                </span>
                <span className="search-option-figure">{option.figure ?? ''}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
