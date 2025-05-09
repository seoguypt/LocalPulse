import { describe, it, expect } from 'vitest'
import { cleanFacebookLink, filterFacebookLinks, cleanInstagramLink, filterInstagramLinks } from '~~/shared/utils/social-links'

describe('Social Media Link Filtering', () => {
  describe('Facebook Link Filtering', () => {
    describe('cleanFacebookLink', () => {
      it('should clean valid profile links', () => {
        expect(cleanFacebookLink('https://www.facebook.com/username')).toBe('https://www.facebook.com/username')
        expect(cleanFacebookLink('https://www.facebook.com/username?ref=123')).toBe('https://www.facebook.com/username')
      })

      it('should handle redirect links', () => {
        const redirectLink = 'https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebook.com%2Fusername&h=123'
        expect(cleanFacebookLink(redirectLink)).toBe('https://www.facebook.com/username')
      })

      it('should reject invalid redirect links', () => {
        expect(cleanFacebookLink('https://l.facebook.com/l.php')).toBeNull()
        expect(cleanFacebookLink('https://l.facebook.com/l.php?u=invalid')).toBeNull()
      })

      it('should reject non-Facebook redirects', () => {
        // Test redirects to non-Facebook domains
        expect(cleanFacebookLink('https://l.facebook.com/l.php?u=https%3A%2F%2Finstagram.com%2Fusername')).toBeNull()
        expect(cleanFacebookLink('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Fcontact')).toBeNull()
        expect(cleanFacebookLink('https://l.facebook.com/l.php?u=https%3A%2F%2Fdanielfaint.com%2Fcontact')).toBeNull()
      })

      it('should reject non-Facebook URLs', () => {
        // Test direct non-Facebook URLs
        expect(cleanFacebookLink('https://www.instagram.com/username')).toBeNull()
        expect(cleanFacebookLink('https://example.com/contact')).toBeNull()
        expect(cleanFacebookLink('https://danielfaint.com/contact')).toBeNull()
      })

      it('should reject non-profile pages', () => {
        expect(cleanFacebookLink('https://www.facebook.com/help/')).toBeNull()
        expect(cleanFacebookLink('https://www.facebook.com/about/')).toBeNull()
        expect(cleanFacebookLink('https://www.facebook.com/watch/')).toBeNull()
        expect(cleanFacebookLink('https://www.facebook.com/groups/')).toBeNull()
        expect(cleanFacebookLink('https://www.facebook.com/events/')).toBeNull()
      })

      it('should reject malformed URLs', () => {
        expect(cleanFacebookLink('not-a-url')).toBeNull()
        expect(cleanFacebookLink('https://')).toBeNull()
      })
    })

    describe('filterFacebookLinks', () => {
      it('should filter and clean multiple links', () => {
        const links = [
          'https://www.facebook.com/username1',
          'https://www.facebook.com/username1?ref=123', // duplicate
          'https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.facebook.com%2Fusername2',
          'https://www.facebook.com/help/', // invalid
          'not-a-url', // invalid
        ]

        const result = filterFacebookLinks(links)
        expect(result).toEqual([
          'https://www.facebook.com/username1',
          'https://www.facebook.com/username2'
        ])
      })

      it('should filter out non-Facebook links', () => {
        const links = [
          'https://www.facebook.com/username1',
          'https://www.instagram.com/username2', // Instagram link
          'https://l.facebook.com/l.php?u=https%3A%2F%2Finstagram.com%2Fusername3', // Instagram redirect
          'https://example.com/contact', // Other domain
        ]

        const result = filterFacebookLinks(links)
        expect(result).toEqual([
          'https://www.facebook.com/username1'
        ])
      })

      it('should handle empty array', () => {
        expect(filterFacebookLinks([])).toEqual([])
      })

      it('should handle array with only invalid links', () => {
        const links = [
          'https://www.facebook.com/help/',
          'not-a-url',
          'https://l.facebook.com/l.php',
          'https://www.instagram.com/username', // Instagram link
          'https://l.facebook.com/l.php?u=https%3A%2F%2Finstagram.com%2Fusername' // Instagram redirect
        ]
        expect(filterFacebookLinks(links)).toEqual([])
      })
    })
  })

  describe('Instagram Link Filtering', () => {
    describe('cleanInstagramLink', () => {
      it('should clean valid profile links', () => {
        expect(cleanInstagramLink('https://www.instagram.com/username')).toBe('https://www.instagram.com/username')
        expect(cleanInstagramLink('https://www.instagram.com/username?ref=123')).toBe('https://www.instagram.com/username')
      })

      it('should handle redirect links', () => {
        const redirectLink = 'https://l.instagram.com/?u=https%3A%2F%2Fwww.instagram.com%2Fusername&e=123'
        expect(cleanInstagramLink(redirectLink)).toBe('https://www.instagram.com/username')
      })

      it('should reject invalid redirect links', () => {
        expect(cleanInstagramLink('https://l.instagram.com/')).toBeNull()
        expect(cleanInstagramLink('https://l.instagram.com/?u=invalid')).toBeNull()
      })

      it('should reject non-Instagram redirects', () => {
        // Test redirects to non-Instagram domains
        expect(cleanInstagramLink('https://l.instagram.com/?u=http%3A%2F%2Fexample.com%2Fcontact')).toBeNull()
        expect(cleanInstagramLink('https://l.instagram.com/?u=https%3A%2F%2Fdanielfaint.com%2Fcontact')).toBeNull()
        expect(cleanInstagramLink('https://l.instagram.com/?u=https%3A%2F%2Ffacebook.com%2Fpage')).toBeNull()
      })

      it('should reject non-Instagram URLs', () => {
        // Test direct non-Instagram URLs
        expect(cleanInstagramLink('https://example.com/contact')).toBeNull()
        expect(cleanInstagramLink('https://danielfaint.com/contact')).toBeNull()
        expect(cleanInstagramLink('https://facebook.com/page')).toBeNull()
      })

      it('should reject non-profile pages', () => {
        expect(cleanInstagramLink('https://www.instagram.com/help/')).toBeNull()
        expect(cleanInstagramLink('https://www.instagram.com/about/')).toBeNull()
        expect(cleanInstagramLink('https://www.instagram.com/explore/')).toBeNull()
        expect(cleanInstagramLink('https://www.instagram.com/reels/')).toBeNull()
        expect(cleanInstagramLink('https://www.instagram.com/p/123/')).toBeNull()
        expect(cleanInstagramLink('https://www.instagram.com/stories/')).toBeNull()
      })

      it('should reject malformed URLs', () => {
        expect(cleanInstagramLink('not-a-url')).toBeNull()
        expect(cleanInstagramLink('https://')).toBeNull()
      })
    })

    describe('filterInstagramLinks', () => {
      it('should filter and clean multiple links', () => {
        const links = [
          'https://www.instagram.com/username1',
          'https://www.instagram.com/username1?ref=123', // duplicate
          'https://l.instagram.com/?u=https%3A%2F%2Fwww.instagram.com%2Fusername2',
          'https://www.instagram.com/p/123/', // invalid
          'not-a-url', // invalid
        ]

        const result = filterInstagramLinks(links)
        expect(result).toEqual([
          'https://www.instagram.com/username1',
          'https://www.instagram.com/username2'
        ])
      })

      it('should filter out non-Instagram redirects', () => {
        const links = [
          'https://www.instagram.com/username1',
          'https://l.instagram.com/?u=https%3A%2F%2Fdanielfaint.com%2Fcontact', // non-Instagram redirect
          'https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fpage', // non-Instagram redirect
        ]

        const result = filterInstagramLinks(links)
        expect(result).toEqual([
          'https://www.instagram.com/username1'
        ])
      })

      it('should handle empty array', () => {
        expect(filterInstagramLinks([])).toEqual([])
      })

      it('should handle array with only invalid links', () => {
        const links = [
          'https://www.instagram.com/p/123/',
          'not-a-url',
          'https://l.instagram.com/',
          'https://danielfaint.com/contact', // non-Instagram URL
          'https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Fpage' // non-Instagram redirect
        ]
        expect(filterInstagramLinks(links)).toEqual([])
      })
    })
  })
}) 