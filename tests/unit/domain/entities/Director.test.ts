import Director from '../../../../backend/src/domain/entities/Director';
import Email from '../../../../backend/src/domain/value-objects/Email';
import FullName from '../../../../backend/src/domain/value-objects/FullName';

describe('Director Entity', () => {
  const name = FullName.create('Maria Lopez');
  const email = Email.create('maria@test.com');

  it('should create a director with create()', () => {
    const director = Director.create(name, email, 'dir-1');
    expect(director.id).toBe('dir-1');
    expect(director.name.getValue()).toBe('Maria Lopez');
    expect(director.email.getValue()).toBe('maria@test.com');
  });

  it('should generate an id when not provided', () => {
    const director = Director.create(name, email);
    expect(director.id).toBeDefined();
    expect(director.id.startsWith('director-')).toBe(true);
  });
});
