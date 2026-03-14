import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, ArrowUpIcon, SparkleSmallIcon, FilePlusIcon, ImageIcon } from './Icons';

interface ChatInputProps {
  disabled?: boolean;
  onTextChange?: (text: string) => void;
  onSubmit?: (text: string) => void;
  placeholder?: string;
}

// 4 lines max: line-height is 20px (--body-3-line)
const MAX_LINES = 4;
const LINE_HEIGHT = 20;
const MAX_TEXTAREA_HEIGHT = MAX_LINES * LINE_HEIGHT;

export default function ChatInput({ disabled = false, onTextChange, onSubmit, placeholder = "How can I help you today?" }: ChatInputProps) {
  const [hasText, setHasText] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Capture the current rendered height
    const prevHeight = el.getBoundingClientRect().height;
    // Remove transition & reset to auto so scrollHeight recalculates
    el.style.transition = 'none';
    el.style.height = 'auto';
    const targetHeight = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    // Pin to the previous height
    el.style.height = `${prevHeight}px`;
    // Force reflow so the browser registers the starting value
    void el.offsetHeight;
    // Re-enable transition and animate to the target
    el.style.transition = 'height 150ms ease-out';
    el.style.height = `${targetHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, []);

  const updateDropdownPosition = useCallback(() => {
    if (plusBtnRef.current) {
      const rect = plusBtnRef.current.getBoundingClientRect();
      // Open above the button so it doesn't clip at the bottom of the page
      const dropdownHeight = 80; // 2 items × 32px + 8px padding + border
      setDropdownPosition({
        top: rect.top - dropdownHeight - 6,
        left: rect.left,
      });
    }
  }, []);

  const closeDropdown = useCallback(() => {
    if (!dropdownOpen || closing) return;
    setClosing(true);
    // Wait for the exit animation to finish before unmounting
    setTimeout(() => {
      setDropdownOpen(false);
      setClosing(false);
    }, 150);
  }, [dropdownOpen, closing]);

  const toggleDropdown = () => {
    if (dropdownOpen) {
      closeDropdown();
    } else {
      updateDropdownPosition();
      setDropdownOpen(true);
      setClosing(false);
    }
  };

  const handleSubmit = useCallback(() => {
    const el = textareaRef.current;
    if (!el || !el.value.trim() || disabled) return;
    const text = el.value.trim();
    onSubmit?.(text);
    el.value = '';
    setHasText(false);
    onTextChange?.('');
    // Reset height
    el.style.transition = 'none';
    el.style.height = 'auto';
    el.style.overflowY = 'hidden';
  }, [disabled, onSubmit, onTextChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Close on click outside
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    // Use a small delay so the opening click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, closeDropdown]);

  // Close on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dropdownOpen, closeDropdown]);

  // Update dropdown position on scroll/resize when open
  useEffect(() => {
    if (!dropdownOpen) return;
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [dropdownOpen, updateDropdownPosition]);

  return (
    <div
      className={`chat-input w-full flex flex-col gap-[24px] items-start overflow-hidden ${disabled ? 'is-disabled' : ''}`}
      style={{
        borderRadius: '24px',
        paddingLeft: '16px',
        paddingRight: '12px',
        paddingTop: '12px',
        paddingBottom: '12px',
      }}
    >
      {/* Input area */}
      <div className="flex flex-col gap-[12px] items-start w-full">
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            autoResize();
            const value = (e.target as HTMLTextAreaElement).value;
            setHasText(value.length > 0);
            onTextChange?.(value);
          }}
          className="w-full resize-none outline-none bg-transparent"
          style={{
            fontFamily: 'var(--font-primary)',
            fontWeight: 'var(--weight-regular)',
            fontSize: 'var(--body-3-size)',
            lineHeight: `${LINE_HEIGHT}px`,
            letterSpacing: 'var(--body-3-spacing)',
            color: disabled ? 'var(--alpha-light-400)' : hasText ? 'var(--alpha-light-900)' : 'var(--alpha-light-600)',
            cursor: disabled ? 'not-allowed' : undefined,
            overflowY: 'hidden',
            maxHeight: `${MAX_TEXTAREA_HEIGHT}px`,
          }}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex items-end justify-between w-full">
        {/* Left side: plus button + AI tag */}
        <div className="flex gap-[8px] items-center relative">
          {/* Plus button */}
          <button
            ref={plusBtnRef}
            className="flex items-center hover:opacity-70 transition-opacity"
            disabled={disabled}
            onClick={() => !disabled && toggleDropdown()}
            style={{
              padding: '2px',
              borderRadius: '6px',
              background: disabled ? 'var(--color-neutral-50)' : 'transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            <PlusIcon className="w-5 h-5" />
          </button>

          {/* Dropdown — rendered via portal to avoid overflow clipping */}
          {dropdownOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className={`plus-dropdown fixed z-[9999] flex flex-col gap-1 ${closing ? 'closing' : ''}`}
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: '144px',
                  paddingTop: '4px',
                  paddingBottom: '4px',
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  borderRadius: '12px',
                  background: 'var(--alpha-dark-600)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid var(--alpha-light-100)',
                  boxShadow:
                    '0px 67px 19px 0px rgba(0,0,0,0), 0px 43px 17px 0px rgba(0,0,0,0.01), 0px 24px 15px 0px rgba(0,0,0,0.02), 0px 11px 11px 0px rgba(0,0,0,0.03), 0px 3px 6px 0px rgba(0,0,0,0.04)',
                }}
              >
              {/* Upload file */}
              <button
                className="plus-dropdown-item flex items-center w-full"
                onClick={() => closeDropdown()}
                style={{
                  height: '32px',
                  padding: '0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="flex items-center flex-1 h-full"
                  style={{
                    gap: '6px',
                    paddingLeft: '6px',
                    paddingRight: '8px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    borderRadius: '8px',
                  }}
                >
                  <FilePlusIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />
                  <span
                    className="font-medium truncate flex-1 min-w-0 overflow-hidden text-left"
                    style={{
                      fontFamily: 'var(--font-primary)',
                      fontSize: 'var(--body-3-size)',
                      lineHeight: 'var(--body-3-line)',
                      letterSpacing: 'var(--body-3-spacing)',
                      color: 'var(--alpha-light-600)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Upload file
                  </span>
                </div>
              </button>

              {/* Upload image */}
              <button
                className="plus-dropdown-item flex items-center w-full"
                onClick={() => closeDropdown()}
                style={{
                  height: '32px',
                  padding: '0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <div
                  className="flex items-center flex-1 h-full"
                  style={{
                    gap: '6px',
                    paddingLeft: '6px',
                    paddingRight: '8px',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    borderRadius: '8px',
                  }}
                >
                  <ImageIcon className="w-5 h-5 shrink-0" color="var(--alpha-light-600)" />
                  <span
                    className="font-medium truncate flex-1 min-w-0 overflow-hidden text-left"
                    style={{
                      fontFamily: 'var(--font-primary)',
                      fontSize: 'var(--body-3-size)',
                      lineHeight: 'var(--body-3-line)',
                      letterSpacing: 'var(--body-3-spacing)',
                      color: 'var(--alpha-light-600)',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Upload image
                  </span>
                </div>
              </button>
            </div>,
              document.body
            )}

          {/* Lucas AI tag */}
          <div
            className="flex items-center"
            style={{
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '24px',
              background: 'var(--alpha-pelorous-50)',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <div className="flex gap-[4px] items-center">
              <SparkleSmallIcon className="w-3 h-3" />
              <span
                className="font-medium whitespace-nowrap"
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 'var(--body-4-size)',
                  lineHeight: 'var(--body-4-line)',
                  letterSpacing: 'var(--body-3-spacing)',
                  color: 'var(--color-pelorous-600)',
                }}
              >
                Lucas AI
              </span>
            </div>
          </div>
        </div>

        {/* Send button */}
        <button className="send-btn" disabled={disabled} onClick={handleSubmit}>
          <span className="send-btn-gradient" aria-hidden />
          <ArrowUpIcon
            className="w-5 h-5 relative z-10"
            color={disabled ? 'var(--alpha-light-200)' : 'var(--alpha-light-600)'}
          />
        </button>
      </div>
    </div>
  );
}
